# -*- coding: utf-8 -*-
"""
:author: ludovic.delaune@oslandia.com
"""
from __future__ import absolute_import, division, print_function, unicode_literals
import sys
import json

from flask import Blueprint, jsonify, Response, render_template
from webargs import Arg, ValidationError
from webargs.flaskparser import use_args
from geojson import FeatureCollection, Feature
import xmltodict

from opentjs.ogcexceptions import *
from opentjs.models import Framework, Dataset, Data
from opentjs.settings import Config
from opentjs.database import db


service = Blueprint(
    'tjs',
    __name__,
    template_folder='templates',
    url_prefix='/tjs'
)


if sys.version < '3':
    def to_unicode(value):
        return unicode(value, encoding='utf-8')
else:
    def to_unicode(value):
        return value


@service.errorhandler(400)
def handle_bad_request(err):
    # webargs attaches additional metadata to the `data` attribute
    data = getattr(err, 'data')
    if data:
        err_message = data['message']
    else:
        err_message = 'Invalid request'
    return jsonify({
        'message': err_message,
    }), 400


# register exceptions to the flask error handler
def ogc_exception_handler(error):
    return Response(error.xml, 400, mimetype='text/xml')


# register handlers for all OGC exceptions
# can't be in a loop...
service.record_once(
    lambda s: s.app._register_error_handler(
        service.name,  # blueprint name
        OperationNotSupported,  # Exception class
        ogc_exception_handler  # handler
    )
)
service.record_once(
    lambda s: s.app._register_error_handler(
        service.name,  # blueprint name
        InvalidParameterValue,  # Exception class
        ogc_exception_handler  # handler
    )
)
service.record_once(
    lambda s: s.app._register_error_handler(
        service.name,  # blueprint name
        MissingParameterValue,  # Exception class
        ogc_exception_handler  # handler
    )
)
service.record_once(
    lambda s: s.app._register_error_handler(
        service.name,  # blueprint name
        OptionNotSupported,  # Exception class
        ogc_exception_handler  # handler
    )
)


def validate_outputfmt(val):
    if val not in ('xml', 'json'):
        raise ValidationError(
            'Output format not supported -> {}'.format(val))


main_args = {
    'request': Arg(str, required=True, use=lambda n: n.lower()),
    'service': Arg(str, required=True, use=lambda n: n.lower()),
    'frameworkuri': Arg(str, required=False, use=lambda n: n.lower()),
    'dataseturi': Arg(str, required=False, use=lambda n: n.lower()),
    'output': Arg(str, required=False, default='xml', use=lambda n: n.lower(),
                  validate=validate_outputfmt),
}


@service.route('/')
@use_args(main_args)
def main(args):

    if args['service'] != 'tjs':
        raise InvalidParameterValue('service')

    if args['request'] not in available_operations:
        raise OperationNotSupported('request')

    content, code = available_operations[args['request']](args)

    output = args['output']
    mimetype = 'text/xml'
    if output == 'json':
        # convert to json if requested
        if args['request'] == 'getframework':
            return jsonify(content)

        mimetype = 'application/json'
        content = json.dumps(xmltodict.parse(content))

    return Response(content, code, mimetype=mimetype)


def getcapabilities(args):
    """
    Gives capabilities
    """
    return render_template(
        '{}.xml'.format(args['request']),
        conf=Config
    ), 200


def describe(args):
    """
    Decribe operations
    """
    if args['frameworkuri']:
        # limit to which is joinable to this spatial framework
        frameworks = [
            frwk for frwk in Framework.query.all()
            if frwk.frameworkuri == args['frameworkuri']
        ]
    else:
        # get all of them
        frameworks = Framework.query.all()
    return render_template(
        '{}.xml'.format(args['request']),
        conf=Config,
        frameworks=frameworks,
    ), 200


def describedata(args):
    """
    Decribe datas operation
    """
    if not args['frameworkuri']:
        raise MissingParameterValue('frameworkuri')

    if not args['dataseturi']:
        raise MissingParameterValue('dataseturi')

    # limit to which is joinable to this spatial framework
    framework = Framework.query\
        .filter(Framework.frameworkuri == args['frameworkuri'])\
        .first()

    if not framework:
        # framework does not exists
        raise InvalidParameterValue('frameworkuri')

    # get requested dataset
    dataset = Dataset.query\
        .filter(Dataset.dataseturi == args['dataseturi'])\
        .first()

    if not dataset:
        # dataseturi does not exists
        raise InvalidParameterValue('dataseturi')

    datas = Data.query\
        .filter(Data.dataset_id == dataset.pkid)\
        .all()

    return render_template(
        '{}.xml'.format(args['request']),
        conf=Config,
        framework=framework,
        dataset=dataset,
        datas=datas
    ), 200


def has_precision_column(schema, table):
    """
    returns true if column exists for this table
    """
    req = """SELECT TRUE
        FROM   pg_attribute
        WHERE  attrelid = '{}.{}'::regclass
        AND    attname = 'precision'
        AND    NOT attisdropped""".format(schema, table)
    row = db.session.execute(req).fetchone()
    return row


def getdata(args):
    if not args['frameworkuri']:
        raise MissingParameterValue('frameworkuri')

    if not args['dataseturi']:
        raise MissingParameterValue('dataseturi')

    # limit to which is joinable to this spatial framework
    framework = Framework.query\
        .filter(Framework.frameworkuri == args['frameworkuri'])\
        .first()

    if not framework:
        # framework does not exists
        raise InvalidParameterValue('frameworkuri')

    # get requested dataset
    dataset = Dataset.query\
        .filter(Dataset.dataseturi == args['dataseturi'])\
        .first()

    if not dataset:
        # dataseturi does not exists
        raise InvalidParameterValue('dataseturi')

    datas = Data.query\
        .filter(Data.dataset_id == dataset.pkid)\
        .all()

    datafk = [data for data in datas if data.isframeworkkey]
    datanofk = [data for data in datas if not data.isframeworkkey]

    precision_col = has_precision_column(dataset.schema, dataset.dataseturi)

    if not datanofk and not datafk:
        row = db.session.execute("""
            select '' as output from {schema}."{table}"
        """.format(
            table=dataset.dataseturi,
            schema=dataset.schema,
        )).fetchone()
    else:
        fk = ','.join([
            '"{}"  as "K"'.format(data.name)
            for data in datafk
        ]) + ',' if datafk else ''

        values = ','.join([
            '"{}"  as "V"'.format(data.name)
            for data in datanofk])

        if precision_col:
            # add silently the precision column
            values = values + ',precision as "V"'

        row = db.session.execute("""
            select xmlagg(xmlelement(name "Row",
                          xmlforest({fk} {values}))) as output
            from {schema}."{table}"
            """.format(
            table=dataset.dataseturi,
            schema=dataset.schema,
            fk=fk,
            values=values)
        ).fetchone()

    return render_template(
        '{}.xml'.format(args['request']),
        conf=Config,
        framework=framework,
        dataset=dataset,
        datas=datas,
        rows=to_unicode(row.output),
    ), 200


def describejoinabilities(args):
    frameworks = Framework.query.all()
    return render_template(
        '{}.xml'.format(args['request']),
        conf=Config,
        frameworks=frameworks
    ), 200


def describekey(args):
    if not args['frameworkuri']:
        raise MissingParameterValue('frameworkuri')

    # limit to which is joinable to this spatial framework
    framework = Framework.query\
        .filter(Framework.frameworkuri == args['frameworkuri'])\
        .first()

    if not framework:
        # framework does not exists
        raise InvalidParameterValue('frameworkuri')

    rows = db.session.execute("""
        select xmlagg(xmlelement(name "Row",
                      xmlforest({fk}, {datas} as "Title"))) as output
        from {schema}."{table}"
        """.format(
        table=framework.frameworkuri,
        schema=framework.schema,
        fk=','.join([
            '"{}" as "K"'.format(frk.name)
            for frk in framework.frameworkkeys
        ]),
        datas=framework.name_attribute)
    ).fetchone()

    return render_template(
        '{}.xml'.format(args['request']),
        conf=Config,
        framework=framework,
        rows=to_unicode(rows.output)
    ), 200


def getframework(args):
    if not args['frameworkuri']:
        raise MissingParameterValue('frameworkuri')

    framework = Framework.query\
        .filter(Framework.frameworkuri == args['frameworkuri'])\
        .first()

    if not framework:
        # framework does not exists
        raise InvalidParameterValue('frameworkuri')

    # force json output
    args['output'] = 'json'

    # retrieve column names
    nongeocolumns = db.session.execute("""
        select column_name
        from information_schema.columns where
        table_schema = '{schema}'
        and table_name = '{table}'
        and udt_name != 'geometry'
        """.format(
        table=framework.frameworkuri,
        schema=framework.schema)
    ).fetchall()

    rows = db.session.execute("""
        select
            st_asgeojson(st_transform({geom}, 4326), 7)::json as geom
            , {columns}
        from {schema}."{table}"
        """.format(
        geom=framework.geometrycolumn,
        table=framework.frameworkuri,
        schema=framework.schema,
        columns=','.join([ncol.column_name for ncol in nongeocolumns])
    )).fetchall()

    return FeatureCollection([
        Feature(
            # id='0',
            geometry=row[framework.geometrycolumn],
            properties={
                ncol.column_name: row[ncol.column_name] for ncol in nongeocolumns
            }
        )
        for row in rows
    ]), 200


def joindata(args):
    pass


# factory to handler each operations separatly
available_operations = {
    'getcapabilities': getcapabilities,
    'describeframeworks': describe,
    'describedatasets': describe,
    'describedata': describedata,
    'getdata': getdata,
    'describejoinabilities': describejoinabilities,
    'describekey': describekey,
    'joindata': joindata,
    'getframework': getframework,
}

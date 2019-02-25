# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals
from os.path import join, dirname
try:
    from io import BytesIO
except ImportError:
    # python2
    from StringIO import StringIO as BytesIO

from mixer.backend.flask import mixer
from lxml import etree
import pytest

from opentjs import create_app
from opentjs.database import db
from opentjs.settings import Config
from opentjs.models import Framework, Dataset, Data


def resource(filename):
    return open(join(dirname(__file__), 'schemas', '1.0', filename))


@pytest.fixture(scope="session")
def app(request):
    app = create_app(env='Testing')

    # deactivate extensions
    Config.ALLOW_EXTENSIONS = False

    mixer.init_app(app)
    db.drop_all(app=app)
    db.create_all(app=app)
    app.test_request_context().push()
    db.session.execute('create extension if not exists postgis')
    db.session.execute("""
        drop table if exists datastat;
        create table datastat as
            select
                1::integer as id,
                100000::integer as population,
                'mylittletown'::varchar as town;

        drop table if exists geotable;
        create table geotable as
            select
                'mylittletown'::varchar as town_name,
                'SRID=4326;POLYGON((40 2, 40.5 2, 40.5 2.5, 40 2.5, 40 2))'::geometry(polygon, 4326) as geom;
        """)
    mixer.blend(
        Framework,
        name_attribute='town_name',
        frameworkuri='geotable',
        frameworkkeys__name='town_name',
        geometrycolumn='geom'
    )
    db.session.execute(
        "update {} set north=0, south=0, east=0, west=0;".format(Framework.__tablename__)
    )
    mixer.blend(Dataset, dataseturi='datastat', framework=mixer.SELECT)
    mixer.blend(Data, name='population', type='integer', dataset=mixer.SELECT)
    mixer.blend(Data, name='town', type='string', isframeworkkey=True, dataset=mixer.SELECT)

    return app


@pytest.yield_fixture
def client(app):
    with app.test_client() as client:
        yield client


def test_describedata_exception(client):

    resp = client.get('/tjs/', data=dict(request='DescribeData', service='tjs'))
    xmlresp = etree.parse(BytesIO(resp.data))
    assert xmlresp.xpath('*[@locator="frameworkuri"]')


def test_getdata_exception(client):

    resp = client.get('/tjs/', data=dict(request='GetData', service='tjs'))
    xmlresp = etree.parse(BytesIO(resp.data))

    assert xmlresp.xpath('*[@locator="frameworkuri"]')


def test_getcapabilities(client):
    xmlschema_src = etree.parse(resource('tjsGetCapabilities_response.xsd'))
    xmlschema = etree.XMLSchema(xmlschema_src)

    resp = client.get('/tjs/', data=dict(request='GetCapabilities', service='tjs'))
    xmlresp = etree.parse(BytesIO(resp.data))

    assert xmlschema.assertValid(xmlresp) is None


def test_describeframework(client):
    xmlschema_src = etree.parse(resource('tjsDescribeFrameworks_response.xsd'))
    xmlschema = etree.XMLSchema(xmlschema_src)

    resp = client.get('/tjs/', data=dict(request='DescribeFrameworks', service='tjs'))
    xmlresp = etree.parse(BytesIO(resp.data))

    assert xmlschema.assertValid(xmlresp) is None


def test_describedatasets(client):
    xmlschema_src = etree.parse(resource('tjsDescribeDatasets_response.xsd'))
    xmlschema = etree.XMLSchema(xmlschema_src)

    resp = client.get('/tjs/', data=dict(request='DescribeDataSets', service='tjs'))
    xmlresp = etree.parse(BytesIO(resp.data))

    assert xmlschema.assertValid(xmlresp) is None


def test_describedata(client):
    xmlschema_src = etree.parse(resource('tjsDescribeData_response.xsd'))
    xmlschema = etree.XMLSchema(xmlschema_src)

    resp = client.get('/tjs/', data=dict(
        request='GetData',
        service='tjs',
        frameworkuri='geotable',
        dataseturi='datastat'))
    xmlresp = etree.parse(BytesIO(resp.data))

    assert xmlschema.assertValid(xmlresp) is None


def test_getdata(client):
    xmlschema_src = etree.parse(resource('tjsGetData_response.xsd'))
    xmlschema = etree.XMLSchema(xmlschema_src)

    resp = client.get('/tjs/', data=dict(
        request='GetData',
        service='tjs',
        frameworkuri='geotable',
        dataseturi='datastat'))
    xmlresp = etree.parse(BytesIO(resp.data))
    assert xmlschema.assertValid(xmlresp) is None


def test_describejoinabilities(client):
    xmlschema_src = etree.parse(resource('tjsDescribeJoinAbilities_response.xsd'))
    xmlschema = etree.XMLSchema(xmlschema_src)

    resp = client.get(
        '/tjs/', data=dict(
            request='DescribeJoinAbilities',
            service='tjs',
            frameworkuri='geotable',
            dataseturi='datastat'))
    xmlresp = etree.parse(BytesIO(resp.data))
    assert xmlschema.assertValid(xmlresp) is None


def test_describekey(client):
    xmlschema_src = etree.parse(resource('tjsDescribeKey_response.xsd'))
    xmlschema = etree.XMLSchema(xmlschema_src)

    resp = client.get(
        '/tjs/', data=dict(
            request='DescribeKey',
            service='tjs',
            frameworkuri='geotable'))
    xmlresp = etree.parse(BytesIO(resp.data))
    assert xmlschema.assertValid(xmlresp) is None

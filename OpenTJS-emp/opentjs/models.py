# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals
from sqlalchemy import CheckConstraint
from sqlalchemy.dialects.postgresql import ENUM
import psycopg2

from opentjs.database import db
from .constants import XML_DATATYPES


DEC2FLOAT = psycopg2.extensions.new_type(
    psycopg2.extensions.DECIMAL.values,
    str('DEC2FLOAT'),
    lambda value, cur: float(value) if value is not None else None)
psycopg2.extensions.register_type(DEC2FLOAT)


# create an enumerated type for xml data types
xmldtypes = ENUM(*XML_DATATYPES, name='tjs_xmldatatypes')

emp_chart_rules = ENUM(
    'abscissa', 'ordinate', 'filter', 'subfilter', 'exclude_crit',
    name='emp_chart_rules')

# many to many relation between framework and framework keys
fkeys = db.Table(
    'tjs_fkeys',
    db.Column('framework_id', db.Integer, db.ForeignKey('tjs_frameworks.pkid')),
    db.Column('frameworkkey_id', db.Integer, db.ForeignKey('tjs_frameworkkey.pkid'))
)


class Framework(db.Model):
    """
    Spatial Framework Model.Framework
    Mainly used to generate metadatas.
    """
    __tablename__ = 'tjs_frameworks'
    pkid = db.Column(db.Integer, primary_key=True)
    # name of the spatial framework == tablename
    frameworkuri = db.Column(db.String, nullable=False, unique=True)
    organization = db.Column(db.String)
    title = db.Column(db.String)
    name_attribute = db.Column(db.String, nullable=False)
    abstract = db.Column(db.Text)
    referencedate = db.Column(db.Date)
    version = db.Column(db.String, default='1.0')
    frameworkkeys = db.relationship(
        'FrameworkKey',
        secondary=fkeys,
        backref=db.backref('Framework', lazy='dynamic')
    )
    # postgresql schema for the spatial tables
    # assumes that spatial datas are on the current database
    schema = db.Column(db.String, default='public')
    geometrycolumn = db.Column(db.String, default='geom')
    west = db.Column(db.Float)
    south = db.Column(db.Float)
    east = db.Column(db.Float)
    north = db.Column(db.Float)

    def __repr__(self):
        return 'Framework: {}'.format(self.title)


class FrameworkKey(db.Model):
    """
    Framework key is the key used to join attribute data and spatial data
    """
    __tablename__ = 'tjs_frameworkkey'
    pkid = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    type = db.Column(xmldtypes, default="string")
    length = db.Column(db.Integer, default=0)
    __table_args__ = (CheckConstraint(length >= 0, name='check_length_positive'), {})
    datakeys = db.relationship("Data", backref="jointo")

    def __repr__(self):
        return 'SpatialKey: {}'.format(self.name)


# many to many relation between framework and datasets
fdatasets = db.Table(
    'tjs_fdatasets',
    db.Column('framework_id', db.Integer, db.ForeignKey('tjs_frameworks.pkid')),
    db.Column('dataset_id', db.Integer, db.ForeignKey('tjs_datasets.pkid'))
)


class Dataset(db.Model):
    """
    Describe the Attribute data tables available from the server
    """
    __tablename__ = 'tjs_datasets'
    # name of the spatial framework == tablename
    framework = db.relationship(
        'Framework',
        secondary=fdatasets,
        backref=db.backref('datasets', lazy='dynamic')
    )
    dataseturi = db.Column(db.String, nullable=False)
    pkid = db.Column(db.Integer, primary_key=True)
    organization = db.Column(db.String)
    title = db.Column(db.String)
    abstract = db.Column(db.Text)
    referencedate = db.Column(db.Date)
    version = db.Column(db.String, default='1.0')
    schema = db.Column(db.String, default='public')

    # extensions
    category = db.relationship('Category')
    category_id = db.Column(db.Integer, db.ForeignKey('tjs_category.pkid'))
    display_map = db.Column(db.Boolean())
    display_curve = db.Column(db.Boolean())
    display_bar = db.Column(db.Boolean())
    display_tab = db.Column(db.Boolean())
    display_print = db.Column(db.Boolean())

    def __repr__(self):
        return self.dataseturi


class Data(db.Model):
    """
    Attribute metadata.
    Gives some informations about the data columns
    """
    __tablename__ = 'tjs_data'
    pkid = db.Column(db.Integer, primary_key=True)
    dataset = db.relationship(
        'Dataset',
        backref=db.backref('datas', lazy='dynamic')
    )
    dataset_id = db.Column(db.Integer, db.ForeignKey('tjs_datasets.pkid'))
    isframeworkkey = db.Column(db.Boolean)

    name = db.Column(db.String, nullable=False)
    type = db.Column(xmldtypes, default="string")
    length = db.Column(db.Integer, default=0)
    purpose = db.Column(db.String, default="Attribute")
    title = db.Column(db.String)
    abstract = db.Column(db.Text)
    values = db.Column(
        ENUM('count', 'measure', 'nominal', 'ordinal', name='tjs_valuetype'),
        default='ordinal')

    # extensions
    curves = db.Column(emp_chart_rules)
    jointoframeworkkey = db.Column(db.Integer, db.ForeignKey('tjs_frameworkkey.pkid'))
    bars = db.Column(emp_chart_rules)
    tabular = db.Column(emp_chart_rules)
    brush = db.Column(emp_chart_rules)
    map = db.Column(emp_chart_rules)
    map_mode = db.Column(ENUM('flow-source', 'flow-dest', 'standard', name='emp_mapmodes'))

    def __repr__(self):
        return '{} : {}'.format(self.dataset.dataseturi, self.name)


class Category(db.Model):
    """
    Extension providing a list of categories for datasets.
    Relation between datasets and category is N..1
    """
    __tablename__ = 'tjs_category'
    pkid = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False, unique=True)

    def __repr__(self):
        return self.name

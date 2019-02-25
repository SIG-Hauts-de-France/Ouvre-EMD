# -*- coding: utf-8 -*-
"""
:author: ludovic.delaune@oslandia.com
"""
from __future__ import absolute_import, division, print_function, unicode_literals
import os


class Defaults(object):
    DEBUG = True
    TESTING = False
    LOG_LEVEL = 'info'
    SECRET_KEY = os.urandom(24)

    # database connection
    PG_HOST = 'localhost'
    PG_DATABASE = 'opentjs'
    PG_PORT = '5432'
    PG_USERNAME = ''
    PG_PASSWORD = ''

    PG_TEST_HOST = 'localhost'
    PG_TEST_DATABASE = 'opentjs_test'
    PG_TEST_PORT = '5432'
    PG_TEST_USERNAME = ''
    PG_TEST_PASSWORD = ''

    # usefull to catch exceptions in uwsgi
    PROPAGATE_EXCEPTIONS = True
    # minify since there are long outputs
    JSONIFY_PRETTYPRINT_REGULAR = False

    # TJSCONFIG
    ServiceTitle = 'OpenTJS Service Name',
    ServiceAbstract = 'Service Abstract',
    ServiceURL = 'http://localhost:5000/tjs/',
    ServicePath = 1,
    ServiceLanguage = 'fr',
    IsDataAccess = True,
    IsDataJoining = True,
    GetDataGeolinkidsLimit = '',
    GetDataAttributeLimit = -1,
    JoinDataAttributeLimit = -1,

    # Extensions not in TJS spec
    ALLOW_EXTENSIONS = True


class Testing(Defaults):
    TESTING = True


class Config(Defaults):
    """
    Global config filled at runtime.
    """
    pass

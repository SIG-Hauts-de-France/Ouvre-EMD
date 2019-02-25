# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import os
import logging
import operator
from os.path import join, abspath, exists, dirname

from flask import Flask
from yaml import load as yload
from flask_wtf.csrf import CsrfProtect

from opentjs.app import service
from opentjs.database import db
from opentjs.admin import admin
from opentjs.settings import Config

__version__ = '0.1.dev0'


Logger = logging.getLogger(__name__)

# define a NullHandler for webargs
# to avoid ‘No handlers could be found for logger ...''
WebargsLogger = logging.getLogger('webargs')
WebargsLogger.addHandler(logging.NullHandler())

# constants for logger
BLACK, RED, GREEN, YELLOW, BLUE, CYAN, WHITE = list(range(7))

COLORS = {
    'CRITICAL': RED,
    'ERROR': RED,
    'WARNING': YELLOW,
    'INFO': GREEN,
    'DEBUG': CYAN,
}

LOG_LEVELS = {
    'debug': logging.DEBUG,
    'info': logging.INFO,
    'warning': logging.WARNING,
    'error': logging.ERROR,
    'critical': logging.CRITICAL
}

COLOR_SEQ = "\033[1;%dm"
RESET_SEQ = "\033[0m"
BOLD_SEQ = "\033[1m"


def formatter_message(message, use_color=True):
    if use_color:
        message = message.replace("$RESET", RESET_SEQ)
        message = message.replace("$BOLD", BOLD_SEQ)
    else:
        message = message.replace("$RESET", "").replace("$BOLD", "")
    return message


class ColoredFormatter(logging.Formatter):

    def __init__(self, msg, use_color=True):
        logging.Formatter.__init__(self, msg)
        self.use_color = use_color

    def format(self, record):
        try:
            msg = record.msg.split(':', 1)
            if len(msg) == 2:
                record.msg = '[%-12s]%s' % (msg[0], msg[1])
        except:
            pass
        levelname = record.levelname
        if self.use_color and levelname in COLORS:
            levelname_color = (
                COLOR_SEQ % (30 + COLORS[levelname]) + levelname + RESET_SEQ)
            record.levelname = levelname_color
        return logging.Formatter.format(self, record)


console = logging.StreamHandler()
color_fmt = formatter_message('[%(asctime)s][%(levelname)-18s][%(module)s] %(message)s')
formatter = ColoredFormatter(color_fmt, use_color=True)
console.setFormatter(formatter)
Logger.addHandler(console)


def set_level(level='info'):
    """
    Set log level
    """
    Logger.setLevel(LOG_LEVELS.get(level))


def register_extensions(app):
    """
    Register extensions into flask application
    """
    db.init_app(app)
    admin.init_app(app)
    app.register_blueprint(service)
    CsrfProtect(app)

    # add a sorting function to jinja2 which takes multiples attributes
    @app.template_filter('sort_multi')
    def sort_multi(iterable, *attrs):
        iterable.sort(key=operator.attrgetter(*attrs))
        return iterable


def load_yaml_config(filename):
    """
    Open Yaml file, load content for flask config and returns it as a python dict
    """
    content = io.open(filename, 'r').read()
    return yload(content).get('flask', {})


def create_app(env='Defaults'):
    """
    Creates application.

    The configuration is loaded in the following steps:

        1. loads Defaults config or that passed as ``env`` argument
        2. overrides with config file defined in environnement variable OPENTJS_SETTINGS
        3. overrides with opentjs.yml if exists locally

    :returns: flask application instance
    """
    app = Flask(__name__)
    app.config.from_object('opentjs.settings.{env}'.format(env=env))

    cfgfile = os.environ.get('OPENTJS_SETTINGS')
    Logger.info(cfgfile)
    if cfgfile:
        app.config.update(load_yaml_config(cfgfile))

    custom_settings = join(join(dirname(abspath(__file__)), '..'), 'opentjs.yml')
    if exists(custom_settings):
        Logger.info("local config found. Using it")
        app.config.update(load_yaml_config(custom_settings))

    if env == 'Testing':
        sqla = 'postgresql://{PG_TEST_USERNAME}:{PG_TEST_PASSWORD}@{PG_TEST_HOST}:{PG_TEST_PORT}/{PG_TEST_DATABASE}'
    else:
        sqla = 'postgresql://{PG_USERNAME}:{PG_PASSWORD}@{PG_HOST}:{PG_PORT}/{PG_DATABASE}'

    app.config['SQLALCHEMY_DATABASE_URI'] = sqla.format(**app.config)

    # global config (not limited to a flask context)
    for key, value in app.config.items():
        setattr(Config, key, value)

    set_level(app.config['LOG_LEVEL'])
    Logger.debug(Config.__dict__)

    register_extensions(app)

    return app

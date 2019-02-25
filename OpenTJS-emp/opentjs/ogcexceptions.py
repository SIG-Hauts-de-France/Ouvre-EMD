# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals
from io import open
from os.path import join, dirname

__all__ = (
    'OGCException',
    'InvalidParameterValue',
    'MissingParameterValue',
    'OperationNotSupported',
    'OptionNotSupported',
)

template = open(join(dirname(__file__), 'templates', 'ogc_exception_report.xml')).read()


class OGCException(Exception):
    def __init__(self, value):
        self.code = self.__class__.__name__
        self.locator = value

    @property
    def xml(self):
        # create XML response
        return template.format(**self.__dict__)


class OperationNotSupported(OGCException):
    pass


class InvalidParameterValue(OGCException):
    pass


class MissingParameterValue(OGCException):
    pass


class OptionNotSupported(OGCException):
    pass

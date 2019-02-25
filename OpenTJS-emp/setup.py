from __future__ import absolute_import, division, print_function, unicode_literals
import os
import re
from setuptools import setup, find_packages

PROJECT_NAME = "opentjs"

here = os.path.abspath(os.path.dirname(__file__))

requirements = (
    'flask==0.10.1',
    'flask-sqlalchemy==2.0',
    'Flask-WTF==0.12',
    'sqlalchemy==1.0.3',
    'mixer==5.1.2',
    'flask-admin==1.3.0',
    'webargs==0.13.0',
    'psycopg2==2.6',
    'lxml==3.4.2',
    'geojson==1.0.9',
    'click==4.0',
    'xmltodict==0.9.2',
    'pyyaml==3.11'
)


def find_version(*file_paths):
    """
    see https://github.com/pypa/sampleproject/blob/master/setup.py
    """
    with open(os.path.join(here, *file_paths), 'r') as f:
        version_file = f.read()

    # The version line must have the form
    # __version__ = 'ver'
    version_match = re.search(r"^__version__ = ['\"]([^'\"]*)['\"]",
                              version_file, re.M)
    if version_match:
        return version_match.group(1)
    raise RuntimeError("Unable to find version string. "
                       "Should be at the first line of __init__.py.")

setup(
    name=PROJECT_NAME,
    version=find_version('opentjs', '__init__.py'),
    description="opentjs implementation with python/postgresql",
    url='http://opentjs.readthedoc.org',
    author='Oslandia',
    author_email='infos@oslandia.com',
    license='GPLv3',
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3.4',
        'License :: OSI Approved :: GNU General Public License v3 (GPLv3)'
    ],
    packages=find_packages(),
    include_package_data=True,
    install_requires=requirements,
    entry_points={
        'console_scripts': ['opentjs = opentjs.command:main'],
    }
)

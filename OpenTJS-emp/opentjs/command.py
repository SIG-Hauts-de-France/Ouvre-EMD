# -*- coding: utf-8 -*-
"""
:author: ludovic.delaune@oslandia.com

Command line utilities
"""
from __future__ import print_function
from opentjs import __version__
from opentjs.database import db
import click


def print_version(ctx, param, value):
    if not value or ctx.resilient_parsing:
        return
    click.echo('Version {}'.format(__version__))
    ctx.exit()


@click.group()
@click.option('--version', is_flag=True, callback=print_version,
              expose_value=False, is_eager=True)
def main():
    pass


@click.command()
def initdb():
    """
    Create the initial database
    """
    from opentjs import create_app
    db.create_all(app=create_app())


@click.command()
def serve():
    """
    Run a local server and serves the application
    """
    from wsgi import app
    app.run()

main.add_command(serve)
main.add_command(initdb)

# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from flask.ext.admin import Admin, BaseView, expose
from flask.ext.admin.contrib.sqla import ModelView

from opentjs.models import Framework, Dataset, FrameworkKey, Data, Category
from opentjs.database import db
from opentjs.settings import Config


class CustomIndex(BaseView):
    @expose('/')
    def index(self):
        return self.render('index.html', config=Config)


class FrameworkAdmin(ModelView):
    """
    Overriding framework keys admin view.
    - hide foreign keys
    - update geographic extent on save
    """
    column_default_sort = 'frameworkuri'
    column_list = (
        'frameworkuri', 'schema', 'organization', 'title', 'name_attribute', 'abstract',
        'referencedate', 'version', 'frameworkkeys', 'geometrycolumn'
    )
    form_columns = column_list
    # add child models
    inline_models = (FrameworkKey, )

    def on_model_change(self, form, model, is_created):
        model.west, model.south, model.east, model.north = db.session.execute("""
            with box as (
                select st_extent(st_transform({}, 4326)) as geom
                from {}.{}
            )
            select st_xmin(geom), st_ymin(geom), st_xmax(geom), st_ymax(geom) from box

        """.format(model.geometrycolumn, model.schema, model.frameworkuri)
        ).fetchone()


class DatasetAdmin(ModelView):
    """
    Overriding dataset admin view
    """
    column_list = (
        'dataseturi', 'schema', 'framework', 'organization', 'title', 'category',
        'abstract', 'referencedate', 'version', 'display_map',
        'display_bar', 'display_tab', 'display_print'
    )
    form_columns = column_list
    column_filters = ('dataseturi', 'title')
    column_default_sort = 'dataseturi'


class DataAdmin(ModelView):
    """
    Overriding data (columns) admin view
    """
    column_filters = ('dataset', 'name')
    column_default_sort = 'dataset.dataseturi'
    column_exclude_list = ('curves', 'brush')
    form_excluded_columns = ('curves', 'brush')

    def scaffold_sortable_columns(self):
        """
        Return sortable columns dictionary (name, field)
        """
        return {
            'dataset': 'dataseturi',
            'isframeworkkey': 'isframeworkkey',
            'name': 'name'
        }


class CategoryAdmin(ModelView):
    pass


admin = Admin()

admin.add_view(FrameworkAdmin(Framework, db.session))
admin.add_view(DatasetAdmin(Dataset, db.session))
admin.add_view(DataAdmin(Data, db.session))
admin.add_view(CategoryAdmin(Category, db.session))

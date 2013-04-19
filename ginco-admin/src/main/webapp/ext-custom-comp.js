/**
 * Copyright or © or Copr. Ministère Français chargé de la Culture
 * et de la Communication (2013)
 * <p/>
 * contact.gincoculture_at_gouv.fr
 * <p/>
 * This software is a computer program whose purpose is to provide a thesaurus
 * management solution.
 * <p/>
 * This software is governed by the CeCILL license under French law and
 * abiding by the rules of distribution of free software. You can use,
 * modify and/ or redistribute the software under the terms of the CeCILL
 * license as circulated by CEA, CNRS and INRIA at the following URL
 * "http://www.cecill.info".
 * <p/>
 * As a counterpart to the access to the source code and rights to copy,
 * modify and redistribute granted by the license, users are provided only
 * with a limited warranty and the software's author, the holder of the
 * economic rights, and the successive licensors have only limited liability.
 * <p/>
 * In this respect, the user's attention is drawn to the risks associated
 * with loading, using, modifying and/or developing or reproducing the
 * software by the user in light of its specific status of free software,
 * that may mean that it is complicated to manipulate, and that also
 * therefore means that it is reserved for developers and experienced
 * professionals having in-depth computer knowledge. Users are therefore
 * encouraged to load and test the software's suitability as regards their
 * requirements in conditions enabling the security of their systemsand/or
 * data to be ensured and, more generally, to use and operate it in the
 * same conditions as regards security.
 * <p/>
 * The fact that you are presently reading this means that you have had
 * knowledge of the CeCILL license and that you accept its terms.
 */


/*
 * Override treeView to be stateful
 * Add filter capabilies too.
 */

Ext.define('Thesaurus.ext.tree.Panel', {
	override : 'Ext.tree.Panel',
	currentFilter : null,
	getState : function() {
		var nodes = [], state = this.callParent();

		var getPath = function(node, field, separator) {

			field = node.idProperty;
			separator = separator || '|';

			var path = [ node.get(field) ], parent = node.parentNode;
			while (parent) {
				path.unshift(parent.get(field));
				parent = parent.parentNode;
			}
			return separator + path.join(separator);
		};
		this.getRootNode().eachChild(function(child) {

			// function to store state of tree recursively

			var storeTreeState = function(node, expandedNodes) {

				if (node.isExpanded() && node.childNodes.length > 0) {

					expandedNodes.push(getPath(node, 'text'));
					node.eachChild(function(child) {
						storeTreeState(child, expandedNodes);
					});
				}
			};

			storeTreeState(child, nodes);

		});

		Ext.apply(state, {
			expandedNodes : nodes
		});

		return state;

	},

	applyState : function(state, callback) {
		var nodes = state.expandedNodes || [], len = nodes.length;
		this.collapseAll();
		var hasBeenExpanded = 0;
		for ( var i = 0; i < len; i++) {
			if (typeof nodes[i] != 'undefined') {
				this.expandPath(nodes[i], 'id', '|', function() {
					hasBeenExpanded++;
					if (hasBeenExpanded==len && callback)
						callback();
				});
			}
		}
		this.callParent(arguments);
	}
});



// This function permits to send related objects when we save a model in case of
// 'hasmany' relation
Ext.data.writer.Json.override({
	getRecordData : function(record) {
		var me = this, i, association, childStore, data = {};
		data = me.callParent([ record ]);

		/* Iterate over all the hasMany associations */
		for (i = 0; i < record.associations.length; i++) {
			association = record.associations.get(i);
			if (association.type == 'hasMany') {
				data[association.name] = [];
				childStore = eval('record.' + association.name + '()');

				// Iterate over all the children in the current association
				childStore.each(function(childRecord) {

					// Recursively get the record data for children (depth
					// first)
					var childData = this.getRecordData.call(this, childRecord);
					if (childRecord.dirty | childRecord.phantom
							| (childData != null)) {
						data[association.name].push(childData);
						record.setDirty();
					}
				}, me);
			}
		}
		return data;
	}
});

Ext.define('Thesaurus.ext.utils', {
	singleton : true,
	userInfo : null,
	msgCt : null,
	renderTpl: ['<div class="msg" role="alert">',
	            	'<h3>{title}</h3>',
	            	'<p>{text}</p>',
	            '</div>'],
	msg : function (title, format) {
		if (!this.msgCt) {
			this.msgCt = Ext.core.DomHelper.insertFirst(document.body, {
				id : 'msg-div'
			}, true);
		}
		var s = Ext.String.format.apply(String, Array.prototype.slice.call(
				arguments, 1));
		var msgTpl = new Ext.XTemplate(this.renderTpl);
		var m = Ext.core.DomHelper.append(this.msgCt, msgTpl.apply({
			title : title,
			text : s
		}), true);
		m.hide();
		m.slideIn('t').ghost("t", {
			delay : 5000,
			remove : true
		});
	}
});


/*
 *  Permit validation (AllowBlank) on htmlEditor
 */
Ext.define('Thesaurus.form.HtmlEditor', {
	override : 'Ext.form.field.HtmlEditor',
	getLabelCellAttrs: function() {
        var me = this,
            labelAlign = me.labelAlign,
            result = '';

        if (labelAlign !== 'top') {
            result = 'valign="top" halign="' + labelAlign+ '"';
        }
        return result + ' class="' + Ext.baseCSSPrefix + 'field-label-cell"';
    },
    getLabelCellStyle: function() {
        var me = this,
            hideLabelCell = me.hideLabel || (!me.fieldLabel && me.hideEmptyLabel);

        var style =  hideLabelCell ? 'display:none;' : '';
        style = style+ ' width:' + (me.labelWidth + me.labelPad) + 'px;';
        return style;
    },
	validate : function() {
		var me = this, isValid = me.isValid();
		if (isValid !== me.wasValid) {
			me.wasValid = isValid;
			me.fireEvent('validitychange', me, isValid);
		}
		return isValid;
	},
	isEmpty : function() {
		var value = this.getValue();
		value = value.replace(/&nbsp;/gi, "");
		value = value.replace(/<p>/gi, "");
		value = value.replace(/<p align=left>/gi, "");
		value = value.replace(/<p align=right>/gi, "");
		value = value.replace(/<p align=center>/gi, "");
		value = value.replace(/<.p>/gi, "");
		value = value.replace(/<br>/gi, "");
		value = Ext.String.trim(value);
		if (value != '') {
			return false;
		}
		return true;
	},
	isValid : function() {
		if (this.allowBlank == false) {
			if (this.isEmpty() == false) {
				return true;
			} else {
				return false;
			}
		} else {
			return true;
		}
	},
	 getSubTplData: function() {
		 var data;
		 data = this.callParent();
		 this.getInsertionRenderData(data, this.subTplInsertions);
		 return data;
	    }
});

Ext.define("Thesaurus.form.field.Trigger", {
	override : 'Ext.form.field.Trigger',
	onTriggerClick: function() {
		this.fireEvent("trigger",this);
	}
});



Ext.define('Thesaurus.container.Container', {
	override : 'Ext.container.Container',
	restrictUI : function ()
	{
		var items = this.query("component");
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
				if (item.checkRoles(arguments) == false) {
					item.restrict();
				}
		}
	}
});


Ext.define('Thesaurus.form.Panel', {
	override: 'Ext.form.Panel',
	  restrict : function() {
		  this.setReadOnlyForAll(true);
	  },
	  setReadOnlyForAll: function(readOnly) {
	    Ext.suspendLayouts();
	    this.getForm().getFields().each(function(field) {
	      field.setReadOnly(readOnly);
	    });
	    Ext.resumeLayouts();
	  }
	});


Ext.define('Thesaurus.Component', {
	override : 'Ext.Component',
	requiredRoles : [],
	checkRoles : function () {
		if (this.requiredRoles.length == 0)
			return true;
		for (var i = 0; i < arguments.length; i++) {
		    if (Ext.Array.contains(this.requiredRoles,arguments[i]))
		    { return true;}
		}
		return false;
	},
	restrict : function() {
		this.setDisabled(true);
		// Set No-OP for enable function...
		this.enable = function () { 
		};
	}
});

/*
 * Define a component to handle custom attributes on terms and concepts.
 */
Ext.define('Thesaurus.CustomAttrForm', {
	extend : 'Ext.form.Panel',
	alias: 'widget.customattrform',
	metadataStore : null,
	dataStore : null,
	initComponent : function() {
		var me = this;
		Ext.applyIf(
				me,
				{
					border: false
				}
		);
		me.callParent(arguments);
	},
	initFields : function(thesaurusId, aCallback)
	{
		var me = this;
		me.metadataStore.getProxy().extraParams = {
            thesaurusId: thesaurusId
        };
		me.metadataStore.load({
			scope: this,
		    callback: function(records, operation, success) {
		    	if (success == true) {
		    		for (var i=0;i<records.length;i++)
		    		{
		    			var record = records[i];
		    			var field = Ext.create('Ext.form.field.Text', {
		    				fieldLabel : record.get('value'),
		    				name : 'customattr_'+record.get('identifier'),
		    				anchor : '70%'
		    			});
		    			me.add(field);
		    			field.show();
		    			
		    		}
		    		if (aCallback)
	    				aCallback();
		    	}
		    }
		});
	},
	load : function (entityID)
	{
		var me = this;
		me.dataStore.getProxy().extraParams = {
            termId: entityID
        };
		me.dataStore.load({
			scope: this,
			callback: function(records, operation, success) {
			    	if (success == true) {
			    		var arrayOfAttribute = [];
			    		for (var i=0;i<records.length;i++)
			    		{
			    			var record = records[i];
			    			var data = {
			    					id : 'customattr_'+record.get('typeid'),
			    					value : record.get('lexicalValue'),
			    			}
			    			arrayOfAttribute.push(data);
			    		}
			    		me.getForm().setValues(arrayOfAttribute);
			    	}
			    }
		});
	},
	save : function (entityID, lang) {
		var me = this;
		if (me.items.length>0) {
			me.dataStore.removeAll();
			var customFormValues = me.getValues();
			Ext.Object.each(customFormValues, function(key, value, myself) {
			    var data = {
			    		'entityid' : entityID,
			    		'lang' : lang,
			    		'typeid' : key.split('_')[1],
			    		'lexicalValue' : value
			    };
			    var model = me.dataStore.add(data);
			    model[0].setDirty(true);
			});
			me.dataStore.save();
		}
		
	}
});

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Input",
    "sap/m/TextArea",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/ui/core/dnd/DragInfo",
    "sap/ui/core/dnd/DropInfo"
], function (Controller, MessageBox, JSONModel, Dialog, Button, Input, TextArea, Select, Item, DragInfo, DropInfo) {
    "use strict";

    return Controller.extend("tablerokanbam.controller.Main", {
        onInit: function () {
            var oModel = new JSONModel({
                columns: [
                    { title: "Pendientes", tasks: [{ text: "Tarea inicial 1", description: "Descripción inicial 1", priority: "Media" }, { text: "Tarea inicial 2", description: "Descripción inicial 2", priority: "Baja" }] },
                    { title: "En Progreso", tasks: [{ text: "Tarea en progreso", description: "Descripción en progreso", priority: "Alta" }] },
                    { title: "Completadas", tasks: [{ text: "Tarea completada", description: "Descripción completada", priority: "Baja" }] }
                ]
            });
            this.getView().setModel(oModel);
            this.renderColumns();
        },

        renderColumns: function () {
            var oKanbanBoard = this.getView().byId("kanbanBoard");
            oKanbanBoard.removeAllContent();

            var aColumns = this.getView().getModel().getProperty("/columns");
            var that = this;

            aColumns.forEach(function (oColumn, columnIndex) {
                var oPanel = new sap.m.Panel({
                    headerText: oColumn.title,
                    width: "350px",
                    content: []
                });

                // Configurando DnD en el Panel
                oPanel.addEventDelegate({
                    onAfterRendering: function () {
                        var oPanelDom = oPanel.getDomRef();
                        if (oPanelDom) {
                            oPanelDom.setAttribute("draggable", "true"); // Establecer como arrastrable
                        }
                    }
                });

                var oVLayout = new sap.ui.layout.VerticalLayout({ width: "100%" });

                oColumn.tasks.forEach(function (oTask, taskIndex) {
                    var oHBox = new sap.m.HBox({
                        alignItems: "Center",
                        items: [
                            new sap.m.Text({
                                text: oTask.text,
                                wrapping: true,
                                width: "200px"
                            }),
                            new Button({
                                icon: "sap-icon://edit",
                                type: "Transparent",
                                press: function () {
                                    that.openEditDialog(columnIndex, taskIndex, oTask);
                                }
                            }),
                            new sap.m.Button({
                                icon: "sap-icon://delete",
                                type: "Transparent",
                                press: function () {
                                    that.deleteTask(columnIndex, taskIndex);
                                }
                            })
                        ],
                        // Configuración de Drag and Drop para las tareas
                        dragStart: function (oEvent) {
                            // Guardamos la información de la tarea en el evento de arrastre
                            oEvent.getParameter("dragSession").setComplexData("taskData", { columnIndex: columnIndex, taskIndex: taskIndex });
                        },
                        drop: function (oEvent) {
                            // Lógica para manejar el "drop"
                            var taskData = oEvent.getParameter("dragSession").getComplexData("taskData");
                            that.moveTask(taskData.columnIndex, taskData.taskIndex, columnIndex, taskIndex);
                        }
                    });

                    oVLayout.addContent(oHBox);
                });

                oPanel.addContent(oVLayout);
                oKanbanBoard.addContent(oPanel);
            });
        },

        // Lógica para mover las tareas entre columnas
        moveTask: function (sourceColumnIndex, sourceTaskIndex, targetColumnIndex, targetTaskIndex) {
            var oModel = this.getView().getModel();
            var aColumns = oModel.getProperty("/columns");

            // Obtener la tarea a mover
            var oTask = aColumns[sourceColumnIndex].tasks.splice(sourceTaskIndex, 1)[0];

            // Insertar la tarea en la nueva columna y en la nueva posición
            aColumns[targetColumnIndex].tasks.splice(targetTaskIndex, 0, oTask);

            oModel.setProperty("/columns", aColumns);
            this.renderColumns();  // Volver a renderizar las columnas después de mover la tarea
        },

        openAddDialog: function () {
            var that = this;
            if (!this.oAddDialog) {
                this.oAddDialog = new Dialog({
                    title: "Agregar Nueva Tarea",
                    content: [
                        new Input({
                            id: "addTaskTitle",
                            placeholder: "Título de la tarea (obligatorio)",
                            required: true,
                            width: "300px"
                        }),
                        new TextArea({
                            id: "addTaskDescription",
                            placeholder: "Descripción breve (opcional)",
                            width: "300px"
                        }),
                        new Select({
                            id: "addTaskPriority",
                            items: [
                                new Item({ key: "Baja", text: "Baja" }),
                                new Item({ key: "Media", text: "Media" }),
                                new Item({ key: "Alta", text: "Alta" })
                            ],
                            width: "300px"
                        })
                    ],
                    beginButton: new Button({
                        text: "Agregar",
                        press: function () {
                            var sTitle = sap.ui.getCore().byId("addTaskTitle").getValue();
                            var sDescription = sap.ui.getCore().byId("addTaskDescription").getValue();
                            var sPriority = sap.ui.getCore().byId("addTaskPriority").getSelectedKey();

                            if (!sTitle) {
                                MessageBox.warning("El título de la tarea es obligatorio.");
                                return;
                            }

                            that.addTask(sTitle, sDescription, sPriority);
                            that.oAddDialog.close();
                            // Limpiar los campos del diálogo después de agregar la tarea
                            sap.ui.getCore().byId("addTaskTitle").setValue("");
                            sap.ui.getCore().byId("addTaskDescription").setValue("");
                            sap.ui.getCore().byId("addTaskPriority").setSelectedKey("");
                        }
                    }),
                    endButton: new Button({
                        text: "Cancelar",
                        press: function () {
                            that.oAddDialog.close();
                            // Limpiar los campos del diálogo después de cancelar
                            sap.ui.getCore().byId("addTaskTitle").setValue("");
                            sap.ui.getCore().byId("addTaskDescription").setValue("");
                            sap.ui.getCore().byId("addTaskPriority").setSelectedKey("");
                        }
                    })
                });
                this.getView().addDependent(this.oAddDialog); // Importante: agregar el diálogo como dependiente de la vista
            }
            this.oAddDialog.open();
        },

        addTask: function (sTitle, sDescription, sPriority) {
            if (sTitle) {
                var oModel = this.getView().getModel();
                var aColumns = oModel.getProperty("/columns");
                aColumns[0].tasks.push({ text: sTitle, description: sDescription, priority: sPriority });
                oModel.setProperty("/columns", aColumns);
                this.renderColumns();
            } else {
                MessageBox.warning("Por favor, introduce un título para la tarea.");
            }
        },

        deleteTask: function (columnIndex, taskIndex) {
            var oModel = this.getView().getModel();
            var aColumns = oModel.getProperty("/columns");
            aColumns[columnIndex].tasks.splice(taskIndex, 1);
            oModel.setProperty("/columns", aColumns);
            this.renderColumns();
        },

        openEditDialog: function (columnIndex, taskIndex, oTask) {
            var that = this;
            if (!this.oEditDialog) {
                this.oEditDialog = new Dialog({
                    title: "Editar Tarea",
                    content: [
                        new Input({
                            id: "editTaskTitle",
                            value: oTask.text,
                            placeholder: "Título de la tarea (obligatorio)",
                            required: true,
                            width: "300px"
                        }),
                        new TextArea({
                            id: "editTaskDescription",
                            value: oTask.description,
                            placeholder: "Descripción breve (opcional)",
                            width: "300px"
                        }),
                        new Select({
                            id: "editTaskPriority",
                            selectedKey: oTask.priority,
                            items: [
                                new Item({ key: "Baja", text: "Baja" }),
                                new Item({ key: "Media", text: "Media" }),
                                new Item({ key: "Alta", text: "Alta" })
                            ],
                            width: "300px"
                        })
                    ],
                    beginButton: new Button({
                        text: "Guardar",
                        press: function () {
                            var sNewTitle = sap.ui.getCore().byId("editTaskTitle").getValue();
                            var sNewDescription = sap.ui.getCore().byId("editTaskDescription").getValue();
                            var sNewPriority = sap.ui.getCore().byId("editTaskPriority").getSelectedKey();

                            if (!sNewTitle) {
                                MessageBox.warning("El título de la tarea es obligatorio.");
                                return;
                            }

                            that.updateTask(columnIndex, taskIndex, sNewTitle, sNewDescription, sNewPriority);
                            that.oEditDialog.close();
                        }
                    }),
                    endButton: new Button({
                        text: "Cancelar",
                        press: function () {
                            that.oEditDialog.close();
                        }
                    })
                });
                this.getView().addDependent(this.oEditDialog);
            } else {
                sap.ui.getCore().byId("editTaskTitle").setValue(oTask.text);
                sap.ui.getCore().byId("editTaskDescription").setValue(oTask.description);
                sap.ui.getCore().byId("editTaskPriority").setSelectedKey(oTask.priority);
            }
            this.oEditDialog.open();
        },

        updateTask: function (columnIndex, taskIndex, sTitle, sDescription, sPriority) {
            var oModel = this.getView().getModel();
            var aColumns = oModel.getProperty("/columns");
            var oTask = aColumns[columnIndex].tasks[taskIndex];
            oTask.text = sTitle;
            oTask.description = sDescription;
            oTask.priority = sPriority;

            oModel.setProperty("/columns", aColumns);
            this.renderColumns();
        }
    });
});

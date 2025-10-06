sap.ui.define(
    ["sap/m/MessageBox", "sap/m/MessageToast", "sap/ui/core/UIComponent"],
    function (MessageBox, MessageToast, UIComponent) {
      "use strict";
      function _createUploadController(oExtensionAPI, Entity) {
        var oUploadDialog;
  
        function setOkButtonEnabled(bOk) {
          oUploadDialog && oUploadDialog.getBeginButton().setEnabled(bOk);
        }
  
        function setDialogBusy(bBusy) {
          oUploadDialog.setBusy(bBusy);
        }
  
        function closeDialog() {
          oUploadDialog && oUploadDialog.close();
        }
  
        function showErrors(message, errors) {
          let formattedErrors = "";
          if (Array.isArray(errors)) {
            errors.forEach(
              (error) =>
                (formattedErrors = formattedErrors + `<p>${error.message}</p>`)
            );
          }
          MessageBox.error(message, { details: formattedErrors || errors });
        }
        function showError(code, target, sMessage) {
          MessageBox.error("Upload failed", { title: "Error" });
        }
  
        function byId(sId) {
          return sap.ui.core.Fragment.byId("excelUploadDialog", sId);
        }
  
        return {
          onBeforeOpen: function (oEvent) {
            oUploadDialog = oEvent.getSource();
            oExtensionAPI.addDependent(oUploadDialog);
          },
  
          onAfterClose: function (oEvent) {
            oExtensionAPI.removeDependent(oUploadDialog);
            oUploadDialog.destroy();
            oUploadDialog = undefined;
          },
  
          onOk: function (oEvent) {
            setDialogBusy(true);
            fetch(oExtensionAPI.getModel().getServiceUrl(), {
              method: "HEAD",
              headers: {
                "X-CSRF-Token": "Fetch",
              },
            })
              .then(function (res) {
                const xsrfToken = res.headers.get("x-csrf-token");
                const oFileUploader = byId("uploader");
                const entityHeader = new sap.ui.unified.FileUploaderParameter();
                const csrfHeader = new sap.ui.unified.FileUploaderParameter();
                entityHeader.setName("entity");
                entityHeader.setValue(Entity);
                oFileUploader.removeHeaderParameter("entity");
                csrfHeader.setName("x-csrf-token");
                csrfHeader.setValue(xsrfToken);
                oFileUploader.addHeaderParameter(entityHeader);
                oFileUploader.addHeaderParameter(csrfHeader);
                var sUploadUri =
                  oExtensionAPI.getModel().getServiceUrl() + "ExcelUpload/excel";
                oFileUploader.setUploadUrl(sUploadUri);
                oFileUploader
                  .checkFileReadable()
                  .then(function () {
                    oFileUploader.upload();
                  })
                  .catch(function (error) {
                    showError("The file cannot be read.");
                    setDialogBusy(false);
                  });
              })
              .catch(function (err) {
                console.log("Fetch Error", err);
              });
          },
  
          onCancel: function (oEvent) {
            closeDialog();
          },
  
          onTypeMismatch: function (oEvent) {
            var sSupportedFileTypes = oEvent
              .getSource()
              .getFileType()
              .map(function (sFileType) {
                return "*." + sFileType;
              })
              .join(", ");
  
            showError(
              "The file type *." +
                oEvent.getParameter("fileType") +
                " is not supported. Choose one of the following types: " +
                sSupportedFileTypes
            );
          },
  
          onFileAllowed: function (oEvent) {
            setOkButtonEnabled(true);
          },
  
          onFileEmpty: function (oEvent) {
            setOkButtonEnabled(false);
          },
  
          onUploadComplete: function (oEvent) {
            var iStatus = oEvent.getParameter("status");
            var oFileUploader = oEvent.getSource();
  
            oFileUploader.clear();
            setOkButtonEnabled(false);
            setDialogBusy(false);
  
            if (iStatus >= 400) {
              var oRawResponse;
              try {
                oRawResponse = JSON.parse(oEvent.getParameter("responseRaw"));
              } catch (e) {
                oRawResponse = oEvent.getParameter("responseRaw");
              }
              if (
                oRawResponse &&
                oRawResponse.error &&
                oRawResponse.error.message
              ) {
                //showError(oRawResponse.error.code, oRawResponse.error.target, oRawResponse && oRawResponse.error && oRawResponse.error.message);
                showErrors(
                  oRawResponse.error.message,
                  oRawResponse.error.details
                );
              }
            } else {
              MessageToast.show("File uploaded successfully");
              oExtensionAPI.refresh();
              closeDialog();
            }
          },
        };
      }
  
      return {
        uploadExcelFile: function (oBindingContext, aSelectedContexts) {
          this.loadFragment({
            id: "excelUploadDialog",
            name: "inventory.ext.fragment.ExcelUpload",
            controller: _createUploadController(this, "Inventory"),
          }).then(function (oDialog) {
            oDialog.open();
          });
        },
      };
    }
    );
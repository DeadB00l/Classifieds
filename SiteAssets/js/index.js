var jq$ = jQuery.noConflict();
var requestHeaders = { 'ACCEPT': 'application/json; odata=verbose' };
var masterUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/GetByTitle('Items')/items";
var attachmentUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/GetByTitle('RelatedImages')/items";
var selectStr = "?$select=ID,Title,Amount,IsSold,Expires,MainImage,AuthorId";
var expandStr = "&$expand=Category,SubCategory,ActionType,Author,AttachmentFiles";
var updateHeaders = {
    'ACCEPT': 'application/json;odata=verbose',
    'X-RequestDigest': jq$('#__REQUESTDIGEST').val(),
    'Content-Type': 'application/json; odata=verbose',
    'X-HTTP-Method': 'MERGE',
    'If-Match': "*"
};

var deleteHeaders = {
    'ACCEPT': 'application/json;odata=verbose',
    'X-RequestDigest': jq$('#__REQUESTDIGEST').val(),
    'Content-Type': 'application/json; odata=verbose',
    'X-HTTP-Method': 'DELETE',
    'If-Match': "*"
};

var classifieds = new Vue({
    el: '#ClassifiedsMaster',
    data: {
        qry: "",
        qryEntry: "",
        items: [
            {
                title: 'Search Results',
                results: []
            },
            {
                title: 'Recent',
                results: []
            },
            {
                title: 'Trending',
                results: []
            },
            {
                title: 'My Items',
                results: []
            }
        ],
        defaultResultCount: 32,
        moreIncrement: 4,
        isLoading: false,
        isSaving: false,
        categories: [],
        subCategories: [],
        types: [],
        singleItem: null,
        actionType: "",
        errMsg: "",
        attachment: null,
        attachments: [],
        selectedCategory: 0,
        selectedSubCategory: 0,
        selectedActionType: 0
    },
    methods: {
        MenuHandler: function(clickedObj) {
            var elementID = "#" + clickedObj;
            
            if(clickedObj.indexOf("Show") === 0)
            {
                jQuery(elementID).parent().parent().find(".sectionItems").show();
                jQuery(elementID).hide();
                jQuery(elementID).removeClass("ShowArrow");
                jQuery(elementID.replace("Show", "Hide")).show();
            }
            else
            {
                jQuery(elementID).parent().parent().find(".sectionItems").hide();
                jQuery(elementID).hide();
                jQuery(elementID.replace("Hide", "Show")).show();                
            }
        },
        EnterCheck: function(e) {
            if(e.keyCode === 13)
                this.GetResults('Title', this.defaultResultCount);
        },
        OnFileChange: function(e) {
            var files = e.target.files || e.dataTransfer.files;            
            if(!files.length)
                return;

            var dataLst = [];
            var binLst = [];
            var tmpAttachments = [];
            for(var i = 0; i < files.length; i++)
            {
                var attachment = {
                    Title: files[i].name,
                    RelatedItemId: this.singleItem.ID,
                    Status: "New",
                    Data: null
                };
                tmpAttachments.push(attachment);
                dataLst.push(this.DataLoader(files[i]));
                //binLst.push(this.BinLoader(files[i]));
            }            
            sessionStorage.setItem('Attachments', JSON.stringify(tmpAttachments));
            //sessionStorage.setItem('BinLoadFinished', false);
            sessionStorage.setItem('DataLoadFinished', false);
            jq$.when.all(dataLst).then(function(results) {
                var attachments = JSON.parse(sessionStorage.getItem('Attachments'));
                for(var i = 0; i < results.length; i++)
                {
                    var currentData = results[i];
                    attachments[i].Data = currentData;
                }
                sessionStorage.setItem('Attachments', JSON.stringify(attachments));
                sessionStorage.setItem('DataLoadFinished', true);
            });
            /*
            jq$.when.all(binLst).then((results) => {
                var attachments = JSON.parse(sessionStorage.getItem('Attachments'));
                for(var i = 0; i < results.length; i++)
                {
                    var currentBin = results[i];
                    attachments[i].binary = currentBin;
                }
                sessionStorage.setItem('Attachments', JSON.stringify(attachments));
                sessionStorage.setItem('BinLoadFinished', true);
            });
            */
            setTimeout(this.LoadFinished, 100);
        },
        LoadFinished: function() {
            //var binLoadFinished = sessionStorage.getItem('BinLoadFinished');
            var dataLoadFinished = sessionStorage.getItem('DataLoadFinished');
            //if((binLoadFinished)&&(dataLoadFinished))
            if(dataLoadFinished)
            {
                //sessionStorage.setItem('BinLoadFinished', false);
                sessionStorage.setItem('DataLoadFinished', false);                
                var tmpAttachments = JSON.parse(sessionStorage.getItem('Attachments'));
                for(var i = 0; i < tmpAttachments.length; i++)
                {
                    this.singleItem.AttachedImages.push(tmpAttachments[i]);
                }
                jq$("#attachmentUpload").val("");
            }
            else
                setTimeout(this.LoadFinished, 300);
        },
        MoreClick: function(itemObj) {
            var moreCount = itemObj.results.length + this.moreIncrement;
            if(itemObj.title == "Search Results")
            {
                if(this.qry.length > 0)
                    GetResults('Title', qry, moreCount);
                else
                    this.GetResults('', moreCount);
            }
            else if(itemObj.title == "Recent")
                this.GetRecentItems(moreCount);
            else if(itemObj.title == "Trending")
                this.GetTrendingItems(moreCount);
            else if(itemObj.title == "My Items")
                this.GetMyItems(moreCount);

            itemObj.results = [];
        },
        BinLoader: function(file) {
            var deferred = jQuery.Deferred();
            var reader = new FileReader();
            reader.onloadend = function(e) {
                console.log("Binary data successfully loaded");
                deferred.resolve(e.target.result);
            };
            reader.onerror = function(e) {
              deferred.reject(e);
            };
            reader.readAsArrayBuffer(file);
            return deferred.promise();

            function _arrayBufferToBase64(buffer) {
                var binary = '';
                var bytes = new window.Uint8Array(buffer);
                var len = bytes.byteLength;
                for (var i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return binary;
            }
        },
        DataLoader: function(file) {
            var deferred = jQuery.Deferred();
            var reader = new FileReader();
            reader.onload = function(e) {
                deferred.resolve(e.target.result);
            };
            reader.onerror = function(e) {
              deferred.reject(e);
            };
            reader.readAsDataURL(file);
            return deferred.promise();
        },
        ClearCategoryFilter: function(categoryObj) {
            this.selectedCategory = 0;
            this.selectedSubCategory = 0;
            categoryObj.subCategories = [];
            this.GetResults('', this.defaultResultCount);
        },
        ClearSubCategoryFilter: function(categoryObj) {
            this.CategoryClick('Category', categoryObj);
        },
        ClearActionTypeFilter: function() {
            this.selectedActionType = 0;
            this.GetResults('', this.defaultResultCount);
        },
        SubCategoryClick: function(field, subObj) {
            this.isLoading = true;
            this.ClearData();
            this.selectedSubCategory = subObj.ID;
            this.GetResults(field, this.defaultResultCount);
        },
        CategoryClick: function(field, categoryObj) {
            this.isLoading = true;
            this.ClearData();
            this.ClearAllSubCategories();
            this.selectedSubCategory = 0;
            this.selectedCategory = categoryObj.ID;
            this.GetCategories(categoryObj, this.selectedCategory);
            this.GetResults(field, this.defaultResultCount);
        },
        ClearAllSubCategories: function() {
            for(var i = 0; i < this.categories.length; i++)
            {
                var currentCategory = this.categories[i];
                currentCategory.subCategories = [];
            }
        },
        CategoryChange: function() {
            this.subCategories = [];
            var parentID = this.singleItem.CategoryID;
            var selectStr = "$select=Title,ID";
            var orderByStr = "&$orderby=Title";
            var filterStr = "&$filter=(ParentID eq " + parentID + ")";
            var restStr = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getByTitle('Category')/items?" + selectStr + orderByStr + filterStr;
            var self = this;
            axios({
                method: 'GET',
                url: restStr,
                headers: requestHeaders                
            }).then(function(resp) {
                var results = resp.data.d.results;
                for(var i = 0; i < results.length; i++)
                {
                    var item = results[i];
                    var categoryObj = { 
                        ID: item.ID,
                        Title: item.Title,
                        subCategories: []
                    };
                    self.subCategories.push(categoryObj);
                }
            }).catch(function(errObj) {
                console.log(errObj);
            });            
        },
        MyItemsClick: function() {
            this.ClearData();
            this.PageLoad();
        },
        GetItem: function(id, actionType) {
            this.actionType = actionType;
            //this.singleItem = itemObj;
            this.GetSingleItem(id);
        },
        NewItemClick: function() {
            this.actionType = "Edit";
            this.singleItem = {
                ID: 0,
                Title: "",
                Amount: "",
                Phone: "",
                Email: "",
                Description: "",
                Expired: new Date(),
                isSold: false,
                isExpired: false,
                canEdit: true,
                Link: "",
                Views: 0,
                EmployeeName: "",
                Category: "",
                CategoryID: 0,
                SubCategory: "",
                SubCategoryID: 0,
                ActionType: "",
                ActionTypeID: 0,
                AttachedImages: []
            };
        },
        CancelClick: function() {
            if((this.singleItem.ID > 0)&&(this.singleItem.AttachedImages.length == 0))
                alert("Please upload atleast one image for this ad.");
            else
                this.ClearForm();
        },
        SaveClick: function() {
            this.isSaving = true;
            if(this.Validate())
            {
                if(this.singleItem.ID === 0)
                    this.CreateItem();
                else
                    this.UpdateItem();
            }
            else
            this.isSaving = false;
        },
        TypeClick: function(tID) {
            this.isLoading = true;
            this.ClearData();
            this.selectedActionType = tID;
            this.GetResults('ActionType', this.defaultResultCount);
        },
        CreateItem: function() {
            this.singleItem.Expires = this.AddDays(30);            
            var restStr = masterUrl;
            var createHeader = {
                'ACCEPT': 'application/json;odata=verbose',
                'X-RequestDigest': jq$('#__REQUESTDIGEST').val(),
                'Content-Type': 'application/json; odata=verbose'
            };
            var self = this;
            axios({
                method: 'POST',
                url: restStr,
                headers: createHeader,
                data: this.GetDataStr(),
            }).then(function(resp) {
                self.UploadAttachments(resp.data.d.ID);
                self.ClearForm();
                self.ClearData();
                self.ClearAllSubCategories();
                self.PageLoad();
                self.isSaving = false;
            }).catch(function(errObj) {
                console.log(errObj);
            });
        },
        UpdateItem: function() {
            this.singleItem.Expires = this.AddDays(30);
            var restStr = masterUrl + "(" + this.singleItem.ID + ")";
            var self = this;
            axios({
                method: 'POST',
                url: restStr,
                headers: updateHeaders,
                data: this.GetDataStr(),
            }).then(function(resp) {
                self.UploadAttachments(self.singleItem.ID);
                self.ClearForm();
                self.ClearData();
                self.ClearAllSubCategories();
                self.PageLoad();
                self.isSaving = false;
            }).catch(function(errObj) {
                console.log(errObj);
            });
        },
        UpdateItemView: function() {
            var newCount = this.singleItem.Views + 1;
            var restStr = masterUrl + "(" + this.singleItem.ID + ")";
            var dataObj = {
                '__metadata': { 
                    'type': this.GetItemTypeForListName("Items") 
                },
                Views: newCount,
            };
            var self = this;
            axios({
                method: 'POST',
                url: restStr,
                headers: updateHeaders,
                data: JSON.stringify(dataObj),
            }).then(function(resp) {
                self.singleItem.Views++;
            }).catch(function(errObj) {
                console.log(errObj);
            });            
        },
        UploadAttachments: function(id) {
            for(var i = 0; i < this.singleItem.AttachedImages.length; i++)
            {
                var currentAttachment = this.singleItem.AttachedImages[i];
                currentAttachment.RelatedItemId = id;
                if(currentAttachment.Status == "New")
                    this.CreateAttachment(currentAttachment);
            }
        },
        AddDays: function(daysToAdd) {
            var today = new Date();
            today.setDate(today.getDate() + daysToAdd);
            return today.toISOString();
        },
        DeleteItemClick: function(id) {
            if(confirm("Are you sure you want to delete this?"))
            {
                var restStr = masterUrl + "(" + id + ")";
                var self = this;
                axios({
                    method: 'POST',
                    url: restStr,
                    headers: deleteHeaders
                }).then(function(resp) {
                    console.log("Successfully Deleted Item");                    
                    self.DeleteItemFromArrays("results", id);
                    self.DeleteItemFromArrays("myItems", id);
                    self.DeleteItemFromArrays("trends", id);
                    self.DeleteItemFromArrays("recent", id);
                    self.DeleteAttachments(id);
                }).catch(function(errObj) {
                    console.log(errObj);
                });                
            }
        },
        DeleteItemFromArrays: function(arrayName, id) {
            for(var i = 0; i < this[arrayName].length; i++)
            {
                var currentItem = this[arrayName][i];
                if(currentItem.ID === id)
                {
                    this[arrayName].splice(i, 1);
                    break;
                }
            }
        },
        GetItemTypeForListName: function(name) {
            return "SP.Data." + name.replace(" ", "_x0020_") + "ListItem";
        },
        GetDataStr: function(typeStr) {
            var expiresDate = new Date(this.singleItem.Expires);
            var mainImageStr = "";
            if(this.singleItem.AttachedImages.length > 0)
                mainImageStr = JSON.stringify(this.singleItem.AttachedImages[0]);

            var dataObj = {
                '__metadata': { 
                    'type': this.GetItemTypeForListName("Items") 
                },
                Title: this.singleItem.Title,
                Amount: this.singleItem.Amount,
                IsSold: this.singleItem.isSold,
                Phone: this.singleItem.Phone,
                Email: this.singleItem.Email,
                CategoryId: this.singleItem.CategoryID,
                SubCategoryId: this.singleItem.SubCategoryID,
                ActionTypeId: this.singleItem.ActionTypeID,
                OBO: this.singleItem.OBO,
                Description: this.singleItem.Description,
                Expires: expiresDate.toISOString(),
                MainImage: mainImageStr
            };
            return JSON.stringify(dataObj);
        },
        GetCategories: function(parentObj, parentID) {
            var self = this;
            var selectStr = "$select=Title,ID";
            var orderByStr = "&$orderby=Title";
            var filterStr = "&$filter=(ParentID eq " + parentID + ")";
            var restStr = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getByTitle('Category')/items?" + selectStr + orderByStr + filterStr;
            this.ClearSearch();
            if((parentObj != null) && (parentObj.subCategories.length > 0))
                return;

            axios({
                method: 'GET',
                url: restStr,
                headers: requestHeaders                
            }).then(function(resp) {
                var results = resp.data.d.results;
                for(var i = 0; i < results.length; i++)
                {
                    var item = results[i];
                    var categoryObj = { 
                        ID: item.ID,
                        Title: item.Title,
                        subCategories: []
                    };
                    if(parentObj != null)
                        parentObj.subCategories.push(categoryObj);
                    else
                        self.categories.push(categoryObj);
                }
            }).catch(function(errObj) {
                console.log(errObj);
            });
        },
        GetTypes: function() {
            var self = this;
            var selectStr = "$select=Title,ID";
            var orderByStr = "&$orderby=Title";
            var filterStr = "";
            var restStr = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getByTitle('Type')/items?" + selectStr + orderByStr + filterStr;            
            this.ClearSearch();
            axios({
                method: 'GET',
                url: restStr,
                headers: requestHeaders                
            }).then(function(resp) {
                var results = resp.data.d.results;
                for(var i = 0; i < results.length; i++)
                {
                    var item = results[i];
                    self.types.push(item);
                }
            }).catch(function(errObj) {
                console.log(errObj);
            });
        },
        Validate: function() {
            var isGood = true;
            this.errMsg = "";
            if(this.singleItem == null)
            {
                isGood = false;
                this.errMsg = "Sorry, no item/ad data found";
            }
            else
            {
                if((this.singleItem.Title == null)||(this.singleItem.Title.length === 0))
                {
                    isGood = false;
                    this.errMsg += "Please enter a title<br />";
                }

                if((this.singleItem.Amount == null)||(this.singleItem.Amount.length === 0))
                {
                    isGood = false;
                    this.errMsg += "Please enter an amount<br />";
                }
                else if(isNaN(this.singleItem.Amount))
                {
                    isGood = false;
                    this.errMsg += "Please enter a valid amount value<br />";
                }

                if((this.singleItem.Description == null)||(this.singleItem.Description.length === 0))
                {
                    isGood = false;
                    this.errMsg += "Please enter a valid description<br />";
                }

                var phoneRegExp = /^(\([0-9]{3}\) |[0-9]{3}-)[0-9]{3}-[0-9]{4}/;
                if((this.singleItem.Phone == null)||(this.singleItem.Phone.length === 0))                        
                {
                    isGood = false;
                    this.errMsg += "Please enter a phone number<br />";
                }
                else if(!this.singleItem.Phone.match(phoneRegExp))
                {
                    isGood = false;
                    this.errMsg += "Please enter a valid phone number<br />";
                }

                var emailRegEx = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
                if((this.singleItem.Email == null)||(this.singleItem.Email.length === 0))                        
                {
                    isGood = false;
                    this.errMsg += "Please enter an email<br />";
                }
                else if(!emailRegEx.test(this.singleItem.Email))
                {
                    isGood = false;
                    this.errMsg += "Please a valid email address<br />";
                }

                if(this.singleItem.Category === 0)
                {
                    isGood = false;
                    this.errMsg += "Please select a Category<br />";
                }

                if(this.singleItem.AttachedImages.length === 0)
                {
                    isGood = false;
                    this.errMsg += "Please upload atleast one image<br />";
                }

                /*
                if(this.singleItem.SubCategory === 0)
                {
                    isGood = false;
                    this.errMsg += "Please select a SubCategory<br />";
                }
                */
            }
            return isGood;
        },
        ClearForm: function() {
            this.errMsg = "";
            this.actionType = "";
            this.singleItem = null;
        },
        ClearSearch: function() {
            this.qry = "";
            this.qryEntry = "";
        },
        ClearData: function() {
            for(var i = 0; i < this.items.length; i++)
            {
                var currentItem = this.items[i];
                currentItem.results = [];
            }
        },
        GetMyItems: function(top) {
            this.ClearSearch();
            var orderByStr = "&$orderby=ID desc&$top=" + top;
            var filterStr = "&$filter=(Author eq " + _spPageContextInfo.userId + ")";
            var qryStr = orderByStr + filterStr;
            this.GetItems(3, qryStr);
        },
        GetResults: function(key, top) {
            this.ClearData();
            var today = new Date();
            var todayStr = today.toISOString(); 
            var orderByStr = "&$orderby=ID desc&$top=" + top;
            var filterStr = "&$filter=(datetime'" + todayStr + "' le Expires)";
            if(this.selectedActionType > 0)
                filterStr += "and(ActionType/ID eq " + this.selectedActionType + ")";

            if(this.selectedCategory > 0)
                filterStr += "and(Category/ID eq " + this.selectedCategory + ")";

            if(this.selectedSubCategory > 0)
                filterStr += "and(SubCategory/ID eq " + this.selectedSubCategory + ")";

            if(this.qryEntry != "") {
                this.qry = this.qryEntry;
                filterStr += "and(substringof('" + this.qry + "'," + key + "))";
            }

            var qryStr = filterStr + orderByStr;
            this.GetItems(0, qryStr);
        },
        GetRecentItems: function(top) {
            var today = new Date();
            var todayStr = today.toISOString();
            var orderByStr = "&$orderby=ID desc";
            var filterStr = "&$filter=(datetime'" + todayStr + "' le Expires)&$top=" + top;
            var qryStr = orderByStr + filterStr;
            this.GetItems(1, qryStr);
        },
        GetTrendingItems: function(top) {
            var today = new Date();
            var todayStr = today.toISOString();
            var orderByStr = "&$orderby=Views desc";
            var filterStr = "&$filter=(datetime'" + todayStr + "' le Expires)&$top=" + top;
            var qryStr = orderByStr + filterStr;
            this.GetItems(2, qryStr);
        },
        GetItems: function(index, qryStr) {
            this.isLoading = true;
            var self = this;
            var restStr = masterUrl + selectStr + qryStr;
            axios({
                method: 'GET',
                url: restStr,
                headers: requestHeaders                
            }).then(function(resp) {
                var results = resp.data.d.results;
                for(var i = 0; i < results.length; i++)
                {
                    var result = results[i];
                    var canEdit = false;
                    var isExpired = false;
                    var mainImageStr = "";                    
                    if(new Date() > new Date(result.Expires))
                        isExpired = true;

                    if(result.AuthorId == _spPageContextInfo.userId)
                        canEdit = true;

                    if((result.MainImage != null)&&(result.MainImage.length > 0))
                        mainImageStr = JSON.parse(result.MainImage);                    

                    var itemObj = {
                        ID: result.Id,
                        Title: result.Title,
                        Amount: result.Amount,
                        isSold: result.IsSold,
                        isExpired: isExpired,
                        Expires: result.Expires,
                        canEdit: canEdit,
                        MainImage: mainImageStr
                    };
                    self.items[index].results.push(itemObj);
                }
                self.isLoading = false;
            }).catch(function(errObj) {
                console.log(errObj);
            });
        },
        EnlargeImage: function(i) {
            this.singleItem.MainImage = this.singleItem.AttachedImages[i];
        },
        GetObjectFromListItem: function(result) {
            var canEdit = false;
            var isExpired = false;
            var mainImageStr = "";
            var attachedImages = [];
            if(new Date() > new Date(result.Expires))
                isExpired = true;

            if(result.AuthorId == _spPageContextInfo.userId)
                canEdit = true;

            if((result.MainImage != null)&&(result.MainImage.length > 0))
                mainImageStr = JSON.parse(result.MainImage);

            var itemObj = {
                ID: result.Id,
                Title: result.Title,
                Amount: result.Amount,
                isSold: result.IsSold,
                isExpired: isExpired,
                Expires: result.Expires,
                canEdit: canEdit,
                Link: "mailto:" + result.Email,
                Phone: result.Phone,
                Email: result.Email,
                Views: result.Views,
                EmployeeName: result.Author.Title,
                Category: result.Category.Title,
                CategoryID: result.CategoryId,
                SubCategory: result.SubCategory.Title,
                SubCategoryID: result.SubCategoryId,
                ActionType: result.ActionType.Title,
                ActionTypeID: result.ActionTypeId,
                MainImage: mainImageStr,
                AttachedImages: [],
                Description: result.Description
            };
            return itemObj;
        },
        GetSingleItem: function(id) {
            //this.singleItem = itemObj;
            var self = this;
            var singleExpandStr = "&$expand=Category,SubCategory,ActionType,Author,AttachmentFiles";
            var singleSelectStr = "?$select=*,AttachmentFiles,Category/Title,SubCategory/Title,ActionType/Title,Author/Title";
            var restStr = masterUrl + "(" + id + ")" + singleSelectStr + singleExpandStr;
            axios({
                method: 'GET',
                url: restStr,
                headers: requestHeaders
            }).then(function(resp) {
                var result = resp.data.d;
                self.singleItem = self.GetObjectFromListItem(result);
                self.CategoryChange();
                self.UpdateItemView();
                self.GetAttachments(self.singleItem.ID);
            }).catch(function(errObj) {
                console.log(errObj);
            });
        },
        DeleteAttachment: function(index) {
            if(confirm("Are you sure you want to delete this attachment?")) {
                if(this.singleItem.AttachedImages[index].Status == "New")
                    this.singleItem.AttachedImages.splice(index, 1);
                else
                    this.DeleteImage(id, index);
            }
        },
        CreateAttachment: function(attachmentObj) {
            var createHeader = {
                'ACCEPT': 'application/json;odata=verbose',
                'X-RequestDigest': jq$('#__REQUESTDIGEST').val(),
                'Content-Type': 'application/json; odata=verbose'
            };
            var dataObj = {
                '__metadata': { 
                    'type': this.GetItemTypeForListName("RelatedImages") 
                },
                Title: attachmentObj.Title,
                Data: attachmentObj.Data,
                RelatedItemId: attachmentObj.RelatedItemId
            };
            axios({
                method: 'POST',
                url: attachmentUrl,
                headers: createHeader,
                data: JSON.stringify(dataObj),
            }).then(function(resp) {
                console.log(resp);
            }).catch(function(errObj) {
                console.log(errObj);
            });
        },
        DeleteImage: function(id, index) {
            var self = this;
            var restStr = attachmentUrl + "(" + id + ")";
            axios({
                method: 'POST',
                url: restStr,
                headers: deleteHeaders
            }).then(function(resp) {
                self.singleItem.AttachedImages.splice(index, 1);
            }).catch(function(errObj) {
                console.log(errObj);
            });
        },
        DeleteAttachments: function(parentID) {
            var filterStr = "&$filter=(RelatedItem/ID eq " + parentID + ")";
            var selectStr = "?$select=ID,Title,Data,RelatedItemId";
            var restStr = attachmentUrl + selectStr + filterStr;
            var self = this;
            axios({
                method: 'GET',
                url: restStr,
                headers: requestHeaders                
            }).then(function(resp) {
                var results = resp.data.d.results;
                for(var i = 0; i < results.length; i++)
                {
                    var currentItem = results[i];
                    self.DeleteImage(currentItem.Id, 0);
                }
            }).catch(function(errObj) {
                console.log(errObj);
            });
        },
        GetAttachments: function(parentID) {
            var filterStr = "&$filter=(RelatedItem/ID eq " + parentID + ")";
            var selectStr = "?$select=ID,Title,Data,RelatedItemId";
            var restStr = attachmentUrl + selectStr + filterStr;
            var self = this;
            axios({
                method: 'GET',
                url: restStr,
                headers: requestHeaders                
            }).then(function(resp) {
                var results = resp.data.d.results;
                for(var i = 0; i < results.length; i++)
                {
                    var currentItem = results[i];
                    var attachmentObj = {
                        ID: currentItem.Id,
                        Title: currentItem.Title,
                        Data: currentItem.Data,
                        RelatedItemID: currentItem.RelatedItemId,
                        Status: "Old"
                    };
                    self.singleItem.AttachedImages.push(attachmentObj);
                }
            }).catch(function(errObj) {
                console.log(errObj);
            });
        },
        PageLoad: function() {
            this.items[0].results = [];
            this.selectedActionType = 0;
            this.selectedCategory = 0;            
            this.GetRecentItems(4);
            this.GetTrendingItems(4);
            this.GetMyItems(4);
        }
    },
    mounted: function() {
        this.GetCategories(null, 0);
        this.GetTypes();
        this.PageLoad();
    }
});
var mailBox = {
	mailBoxitems:[{mailBoxId:2, boxType:'Inbox', boxUserId:74, from:'Tapaswi panda', sub:'test mail', readStatus:0,repliedStatus:1, time:'9:34 pm'},{mailBoxId:4, boxType:'Inbox', boxUserId:74, from:'Tapaswi panda', sub: 'new test mail', readStatus:1,repliedStatus:1,  time:'10:34 pm'}],
	currentBox: 1, // 1:inbox, 0:drafts, 2:sent, 3: trash
	currentPage: 1,
	totalPages: 1,
	perPage: 20,
	boxUnreadItemsCount: {},
	currentFilter: {},
	init: function () {
		this.cacheDom();
		this.loadMailBox(this.currentFilter);
		this.bindEventsOnLoad();
		this.getUnreadCount();
		datePikerInit('mailbox_search_end');
		datePikerInit('mailbox_search_begin');
	},
	cacheDom: function() {
		this.$mainContainer = $("#mainContentReplace");
		this.$mainContent = $("#mainContent");
		this.$mailCompose = this.$mainContent.find('.composeMail');
		this.$checkMail = this.$mainContent.find('.checkMail');
		this.$refreshBtn = this.$mainContent.find('.mailboxFilterBtn');
		this.$mailboxNav = this.$mainContainer.find('.mailboxNav');

		this.mailBoxTemplateSrc = $("#mailbox-template").html();
		this.mailViewTemplateSrc = $("#mailView-template").html();

		this.$mailBox = $("#mailTables");
		this.$mailBoxHeader = $("#mailHeader");
		this.$mailView = $("#viewMail");
		this.$selectMailItems = this.$mainContent.find('.selectMailBoxItems');
		this.$mailFunctionLinks = this.$mainContent.find('.mailFunctionLinks');

		this.$readStatusChange = this.$mainContent.find('.readStatusChange');
		this.$deleteMailItems = this.$mainContent.find('.deleteMailItems');

		this.$checkMail = this.$mainContent.find('.checkMail');
		this.$mailboxPerPage = $("#mailboxPerPage");
		this.$mailboxOrderBy = $("#mailboxOrderBy");

		this.$pagination = this.$mainContent.find('.pagination');

		this.$manageFolder = $("#manageFolders");

	},
	bindEventsOnLoad:function() {
		this.$mailCompose.off('click').on('click', function () { composeMail.getMesageWindow() });
		this.$refreshBtn.off('click').on('click', function () { mailBox.setAndLoadCurrentFilter() });
		
		this.$mailboxNav.off('click').on('click', function (e) {
			e.preventDefault();
			mailBox.changeMailBoxAndLoad($(this).attr('data-mailbox-type'));
			mailBox.$mailboxNav.removeClass('current');
			$(this).addClass('current'); //highlighting the current box
		});

		this.$selectMailItems.off('change').on('change', function(e){
			e.preventDefault();
			e.stopPropagation();
			var selType = $(this).val();
			mailBox.selectMailBoxItems(selType);
		});

		this.$readStatusChange.off('click').on('click', function (e) {
			e.preventDefault();
			mailBox.changeMailItemStatus(mailBox.getSelectedMailBoxItems(), $(this).attr('data-read-action-type'));
		});

		this.$deleteMailItems.off('click').on('click', function (e) {
			e.preventDefault();
			mailBox.deleteMailItems(mailBox.getSelectedMailBoxItems(), mailBox.currentBox);
		});

		this.$checkMail.off('click').on('click', function (e) {
			e.preventDefault();
			mailBox.setAndLoadCurrentFilter();
			mailBox.getUnreadCount();
		});

		this.$mailboxPerPage.off('change').on('change', function(e){
			e.preventDefault();
			mailBox.setAndLoadCurrentFilter();
		});

		this.$mailboxOrderBy.off('change').on('change', function(e){
			e.preventDefault();
			mailBox.setAndLoadCurrentFilter();
		});
	},
	changeMailItemStatus: function (itemArray, readStatus) {
		if(itemArray.length > 0) {
			$.ajax({
				type: "POST",
				url: AJAX_PATH+"portal/mailbox.php",
				data: {action:'change_mail_read_status', boxType: this.currentBox, mailIdArray: itemArray, readStatus: readStatus},
				success: function(res) {
					if(res.status) {
						mailBox.setAndLoadCurrentFilter();
						mailBox.getUnreadCount();
					} else {
						show_alert(res.msg);
						$('#alertBtn').click(function() {
							hide_alert();
						});
					}
				},
				dataType:'json'
			});
		} else {
			show_alert('Please select atleast one item to perform your action.');
			$('#alertBtn').click(function() {
				hide_alert();
			});
		}
	},
	deleteMailItems: function (itemArray, boxType) {
		if(itemArray.length > 0) {
			$.ajax({
				type: "POST",
				url: AJAX_PATH+"portal/mailbox.php",
				data: {action: 'delete_mail', boxType: boxType, mailIdArray: itemArray},
				success: function(res) {
					if(res.status) {
						mailBox.setAndLoadCurrentFilter();
						mailBox.getUnreadCount();
					} else {
						show_alert(res.msg);
						$('#alertBtn').click(function() {
							hide_alert();
						});
					}
				},
				dataType:'json'
			});
		} else {
			show_alert('Please select atleast one mail to delete.');
			$('#alertBtn').click(function() {
				hide_alert();
			});
		}
	},
	selectMailBoxItems: function (selType) {
		var $mailItemCheckBox = this.$mailBox.find('.toolsIcon .mailboxItemCheckBox');
		$mailItemCheckBox.each(function(i) {
			var readStatus = $(this).attr("data-read-status");
			if(readStatus == selType || selType == 2)
			this.checked = true;
			else 
			this.checked = false;
		});
		this.showOrHideMailFunctionLinks();
	},
	showOrHideMailFunctionLinks: function () {
		var selectedItems = this.getSelectedMailBoxItems();
		if(selectedItems.length > 0)
		this.$mailFunctionLinks.show();
		else
		this.$mailFunctionLinks.hide();
	},
	getSelectedMailBoxItems: function () {
		var $mailItemCheckBox = this.$mailBox.find('.toolsIcon');
		var checkboxValues = [];
		$mailItemCheckBox.find('input[type="checkbox"]:checked').map(function() {
		    checkboxValues.push($(this).val());
		});
		return checkboxValues ;
	},
	setCurrentBox: function(newBox) {
		this.currentBox = newBox;
	},
	setMailBoxitems: function(newItems){
		this.mailBoxitems = newItems;
	},
	setDefaultPaging: function() {
		this.currentPage = 1;
		this.totalPages = 1;
		this.perPage = 20;
	},
	setAndLoadCurrentFilter: function() {

		var filterOptions = {};

		filterOptions.boxType = this.currentBox;
		filterOptions.readStatus = $('#mailboxReadStatus').val();

		var orderBy = $('#mailboxOrderBy').val().toString();

		switch(orderBy) {
			case "0":
				filterOptions.orderBy = 'desc';
				filterOptions.orderType = 'date';
			break;
			case "1":
				filterOptions.orderBy = 'asc';
				filterOptions.orderType = 'date';
			break;
			case "2":
				filterOptions.orderBy = 'asc';
				filterOptions.orderType = 'sender';
			break;
			case "3":
				filterOptions.orderBy = 'desc';
				filterOptions.orderType = 'sender';
			break;
			case "4":
				filterOptions.orderBy = 'asc';
				filterOptions.orderType = 'subject';
			break;
			case "5":
				filterOptions.orderBy = 'desc';
				filterOptions.orderType = 'subject';
			break;
		} 

		filterOptions.email_begin_month = $('#mailbox_search_begin_month').val();
		filterOptions.email_begin_date = $('#mailbox_search_begin_date').val();
		filterOptions.email_begin_year = $('#mailbox_search_begin_year').val();

		filterOptions.email_end_month = $('#mailbox_search_end_month').val();
		filterOptions.email_end_date = $('#mailbox_search_end_date').val();
		filterOptions.email_end_year = $('#mailbox_search_end_year').val();

		this.perPage = $('#mailboxPerPage').val();

		filterOptions.perPage = this.perPage;
		filterOptions.pageNo = this.currentPage;

		this.currentFilter = filterOptions;

		this.loadMailBox(this.currentFilter);
	},
	resetCurrentFilter: function() {
		this.currentFilter = {};
		this.currentFilter.boxType = this.currentBox;
		this.setDefaultPaging();
		this.resetInputFilters();
	},
	resetInputFilters: function () {
		$('#mailboxReadStatus').val('');
		$('#mailboxOrderBy').val(0);
		$('#mailboxPerPage').val(20);
		$('#dateRangeSelectBox').val('').change();
	},
	changeMailBoxAndLoad: function(newBox, folderId) {
		this.setCurrentBox(newBox); // chnage the box type
		this.resetCurrentFilter(); // reset filter options to default
		if(typeof folderId !== 'undefined' && folderId > 0);
		this.currentFilter.folderId = folderId

		this.loadMailBox(this.currentFilter);  // load current box
	},
	loadMailBoxPage: function (pageType) {
		if(pageType == 'Next')
		this.currentPage = (this.currentPage < this.totalPages) ? (this.currentPage + 1) : 1;
		else if(pageType == 'Prev')
		this.currentPage = (this.currentPage <= 1 ) ? this.totalPages : this.currentPage - 1;
		else
		return false;

		this.currentFilter.pageNo = this.currentPage;
		this.loadMailBox(this.currentFilter);
	},
	loadMailBox: function(filterObj) {
		filterObj.action = 'get_mail_list';
		$.ajax({
			type: "POST",
			url: AJAX_PATH+"portal/mailbox.php",
			data: filterObj,
			success: function(res) {
				mailBox.setMailBoxitems(res);
				mailBox.renderMailBox(); // rendering the mail box with new items
			},
			dataType:'json'
		});
	},
	renderMailBox: function () {
		this.totalPages = this.mailBoxitems.totalPages;
		var mailBoxHtml = Handlebars.compile(this.mailBoxTemplateSrc)(this.mailBoxitems);
		this.$mailBox.html(mailBoxHtml);
		this.toggleMailBoxView('mailbox');
		this.$mailBox.find('.mailboxItemtr a').off('click').on('click', function(e) {
			e.preventDefault();
			e.stopPropagation();
			var parentTr = $(this).parents('tr');
			var mailId = parentTr.attr('data-mailId');
			parentTr.removeClass('bold');
			mailBox.getMailContent(mailId);
		});

		this.$pagination.hide();
		if(this.mailBoxitems.totalPages && this.mailBoxitems.totalPages > 0) {
			this.$pagination.show();
			this.$pagination.find('.currentPage').html(this.currentPage);
			this.$pagination.find('.totalPages').html(this.mailBoxitems.totalPages);

			if(this.mailBoxitems.totalPages > 1) {
				this.$pagination.find('.paginationLink').off('click').on('click', function(e) {
					e.preventDefault();
					mailBox.loadMailBoxPage($(this).attr('data-page-type'));
				});
			}
		}

		this.$mailBox.find('.mailboxItemCheckBox').off('change').on('change', function(e) {
			mailBox.showOrHideMailFunctionLinks();
		});

		this.$selectMailItems.val('');
		this.showOrHideMailFunctionLinks();
	},
	getMailContent:function(mailId) {
		var parent = this;
		$.ajax({
			type: "POST",
			url: AJAX_PATH+"portal/mailbox.php",
			data: {action:'get_mail_content', mailId: mailId, boxType: this.currentBox},
			success: function(res) {
				var mailViewHtml = Handlebars.compile(parent.mailViewTemplateSrc)(res);		
				parent.$mailView.html(mailViewHtml);
				parent.toggleMailBoxView('content');
				parent.bindMailContentEvents(mailId, parent.currentBox);
				parent.getUnreadCount();
			},
			dataType:'json'
		});		
	},
	bindMailContentEvents: function (mailId, boxType) {
		var boxName = "<< Back to Inbox";
		switch(boxType.toString()) {
			case "1":
			boxName = "<< Back to Inbox";
			break;
			case "2":
			boxName = "<< Back to Sent";
			break;
			case "0":
			boxName = "<< Back to Draft";
			break;
			case "3":
			boxName = "<< Back to Trash";
			break;
		}
		this.$mailView.find('.backToInbox').off('click').on('click', function (e) {
			e.preventDefault();
			e.stopPropagation();
			mailBox.toggleMailBoxView('mailbox');
		}).html(boxName);

		this.$mailView.find('.replyButtons li').off('click').on('click', function (e) {
			e.preventDefault();
			var replyType = $(this).attr('data-reply-type');
			mailBox.toggleMailBoxView('mailbox');
			composeMail.getMesageWindow();
		});

		this.$mailView.find('.mailItemDeleteBtn').off('click').on('click', function (e) {
			e.preventDefault();
			var mailItemArray = [mailId];
			mailBox.deleteMailItems(mailItemArray, boxType);
		});

		this.$mailView.find('.mailPrintBtn').off('click').on('click', function (e) {
			e.preventDefault();
			$('#formHeader').find('.formTable').css('border','none');
			$.print("#formMailBody");
		});
	},
	toggleMailBoxView: function (type) {
		if(type == 'content') {
			this.$mailBox.hide();
			this.$mailBoxHeader.hide();
			this.$manageFolder.hide();
			this.$mailView.show();
		} else if(type == 'mailbox') {
			this.$mailView.hide();
			this.$manageFolder.hide();
			this.$mailBox.show();
			this.$mailBoxHeader.show();
		} else if(type == 'manageFolders') {
			this.$mailBox.hide();
			this.$mailBoxHeader.hide();
			this.$mailView.hide();
			this.$manageFolder.show();
		}
	},
	getUnreadCount: function() {
		var parent = this;
		$.ajax({
			type: "POST",
			url: AJAX_PATH+"portal/mailbox.php",
			data: {action: 'get_mailbox_unread_count'},
			success: function(res) {
				parent.setUnreadCounts(res);
			},
			dataType:'json'
		});
	},
	setUnreadCounts: function(unreadItems) {
		this.boxUnreadItemsCount = unreadItems;
		this.$mainContainer.find('.unReadCount').html(''); // making all blank first, then set new counts
		(this.boxUnreadItemsCount.inbox > 0)?$('#inbox .unReadCount').html("("+this.boxUnreadItemsCount.inbox+")"):'';
		(this.boxUnreadItemsCount.sent > 0)?$('#sent .unReadCount').html("("+this.boxUnreadItemsCount.sent+")"):'';
		(this.boxUnreadItemsCount.draft > 0)?$('#drafts .unReadCount').html("("+this.boxUnreadItemsCount.draft+")"):'';
		(this.boxUnreadItemsCount.trash > 0)?$('#trash .unReadCount').html("("+this.boxUnreadItemsCount.trash+")"):'';
	}

}

var composeMail = {
	userList:[],
	init:function() {
		this.composeMailTemplateSrc = $("#composeMail-template").html();
		this.getMailContacts();
	},
	getMailContacts: function () {
  		var parent = this;
		$.ajax({
			type: "POST",
			url: AJAX_PATH+"portal/mailbox.php",
			data: {action: 'get_contact_list'},
			success: function(res) {
				parent.setuserList(res);
			}	
		});
	},
	setuserList: function(newUserList) {
		this.userList = jQuery.parseJSON(newUserList);
	},
	attachDefaultEvents: function () {
		this.$composeMailEditor.jqte();
		$('#composeMailTo, #composeMailCC, #composeMailBCC').pqSelect({
			multiplePlaceholder: 'Select',
			checkbox: true, //adds checkbox to options
			width: 400
		});
	},
	bindClickEvents: function () {
		this.$composeMail.find('.composeMailType').off('click').on('click',
			function (e) {
				e.preventDefault();
				composeMail.$composeMail.find('.composeMailSel'+$(this).attr('data-mail-type')).toggle();
		});

		this.$composeMail.find('.mailAttachmentBtn').off('click').on('click',
			function (e) {
				e.preventDefault();
				composeMail.$mailAttachmentFile.click();
		});

		this.$mailAttachmentFile.off('change').on("change", function(e) {
			e.preventDefault();
			composeMail.attachmentSubmit();
		});

		this.$mailAttachmentFrom.submit(function(e) {
			e.preventDefault();
			composeMail.uploadAttachment();
		});
		this.$composeMail.find('.composeMailAction').off('click').on('click',
			function (e) {
				e.preventDefault();
				composeMail.saveOrSendMail($(this).attr('data-mail-action'));
		});

	},
	saveOrSendMail: function(actionType) {
		var validate = this.validateBeforeSaveOrSend(actionType);

		if(validate) {
			var parent = this;
			this.mailData.action = 'send_mail';
			$.ajax({
				type: "POST",
				url: AJAX_PATH+"portal/mailbox.php",
				data: this.mailData,
				success: function(res) {
					var composeWin =dHTML.widgets['compose_mail'];
					composeWin.close()
				}	
			});
		}
	},
	validateBeforeSaveOrSend: function(actionType) {
		var newMailData = {};
		newMailData.attachments = composeMail.$mailAttachmentHid.val();
		newMailData.msg = $('#composeMailEditor').val();
		newMailData.subject = $('#composeMailSub').val();
		newMailData.from = $('#composeMailFrom').val();
		newMailData.to = $('#composeMailTo').val();
		newMailData.CC = $('#composeMailCC').val();
		newMailData.BCC = $('#composeMailBCC').val();
		newMailData.actionType = actionType;
		newMailData.readReceipt = $('#mailReadReceipt:checked').val();
		
		if(newMailData.actionType == 'send') {
			if(!newMailData.to) {
				alert('Please specify a sender.');
				return false;
			}
			else if(!$.trim(newMailData.subject)) {
				alert('Please specify a subject.');
				return false;
			}
		} else if(newMailData.actionType == 'save' && (!newMailData.attachments && !$.trim(newMailData.subject) && !$.trim(newMailData.msg))) {
			alert('Please specify a subject, msg or attachment to save the draft.');
			return false;
		}
		this.mailData = newMailData;
		return true;
	},
	attachmentSubmit: function() {
		var $this = this.$mailAttachmentFile;

		if($this.val() != '' && $this.length > 0) {
			var check = 0;
			for(var i=0; i < $this.get(0).files.length; i++) {
				var file = $this.get(0).files[i];
				check += file.size;
			}
		}
		if(parseInt(check) > 10485760) {					
			show_alert('The file size can not exceed 10MB.');
			$('#alertBtn').click(function() {
				hide_alert();
				composeMail.$mailAttachmentFile.val('');
			});
		}else {
			this.$mailAttachmentFrom.attr("action",AJAX_PATH+'portal/mailbox.php?action=upload_file');
			this.$mailAttachmentFrom.submit();
		}
	},
	uploadAttachment: function () {
	    if(this.$mailAttachmentFile.val()) {	       

	        this.$mailAttachmentFrom.ajaxSubmit({ 
	            beforeSubmit: function() {
	            	composeMail.$mailAttachmentProgressDiv.removeClass('noDisplay');
	              	composeMail.$mailAttachmentProgressBar.width('0%');
	            },
	            uploadProgress: function (event, position, total, percentComplete){
	                composeMail.$mailAttachmentProgressBar.width(percentComplete + '%').html('<div id="progress-status">' + percentComplete +' %</div>')
	            },
	            success:function (res){
	            	
	                composeMail.$mailAttachmentProgressDiv.addClass('noDisplay');

	                if(res.length) {
	                	var htmlFile = "";
	                	res = $.parseJSON(res);
	                	for(i in res) {	
	                		htmlFile += '<tr class="attachFile" id="trAttachedFile_'+res[i].fileId+'"><td colspan="2">'+res[i].fileName+'<img src="_images/icons/trash.png" class="marginLeftSm" alt="Remove" title="Remove" onClick="composeMail.deleteUploadedFile('+res[i].fileId+');"></td></tr>';
	                		if(composeMail.$mailAttachmentHid.val() != "") {
	                			composeMail.$mailAttachmentHid.val(composeMail.$mailAttachmentHid.val()+","+res[i].fileId);
	                		}else {
	                			composeMail.$mailAttachmentHid.val(res[i].fileId);
	                		}	                		
	                	}
	                	if(htmlFile != "") {
	                		$('#composeTable tr:last').after(htmlFile);
	                	}
	                }
	                
	            },
	            resetForm: true 
	        }); 
	        return false; 
	    }
	},
	deleteUploadedFile: function (fileId) {
		if(fileId > 0) {
			show_loading();
			$.ajax({
				type: 'POST',
				url: AJAX_PATH+'portal/mailbox.php',
				data: {action:'delete_file',fileId:fileId},
				success: function(res) {
					hide_loading();
					$('#trAttachedFile_'+fileId).remove();
					var arr = composeMail.$mailAttachmentHid.val().split(',');
					if(arr.indexOf(""+fileId+"") != -1) {
						arr.splice(arr.indexOf(fileId), 1);
					}
					composeMail.$mailAttachmentHid.val(arr.toString())
				}
			});
		}
	},
	getMesageWindow:function() {
		var win = new dWindow();
		win.name = 'compose_mail';
		dHTML.registerWidget(win);			
		var posleft = (screen.availWidth / 2) - 400;			
		win.defaultposition={width:800,top:10,left:posleft};
		win.Init({title:'New Message',
		icon:BASE_PATH+'_styles/_images/forms/email.png'});
		this.render(win);
	},
	render: function(popWin) {
		$("#composeMail").remove();
		popWin.content.innerHTML = Handlebars.compile(this.composeMailTemplateSrc)(this.userList);
		blockBackground(1);
		popWin.container.style.zIndex = 1003;
		popWin.open();
		$("#composeMail").parent().attr('id','winComposeMail');
		this.cacheDom();
		this.attachDefaultEvents();
		this.bindClickEvents();
	},
	cacheDom: function() {
		this.$mainContent = $("#mainContent");
		this.$composeMail = $("#composeMail");

		this.$mailAttachmentFile = this.$composeMail.find('.mailAttachmentFile');
		this.$mailAttachmentFrom = this.$composeMail.find('.mailAttachmentFrom');
		this.$mailAttachmentProgressDiv = $("#mailAttachmentProgressDiv");
		this.$mailAttachmentProgressBar = $("#mailAttachmentProgressBar");
		this.$mailAttachmentHid = $('#mailAttachmentHid');
		this.$composeMailEditor = $('#composeMailEditor');
	}
}

var manageFolder = {
	folderItems: {},
	init: function () {
		this.cacheDom();
		this.bindDefaultEvents();
		this.getFolderItems();		
	},
	cacheDom: function () {
		this.$mainContainer = $("#mainContentReplace");
		this.$mainContent = $("#mainContent");
		this.$manageFolder = $("#manageFolders");
		this.$manageFolderNav = this.$mainContainer.find('.manageFolderNav');

		this.manageFolderTemplateSrc = $("#manageFolder-template").html();

		this.$leftMenuCustomFolder = this.$mainContainer.find('.customFolderLeftMenu');
		
	},
	bindDefaultEvents: function () {
		this.$manageFolderNav.off('click').on('click', function () { manageFolder.renderManageFolder() });
	},
	renderManageFolder: function () {
		var mailBoxHtml = Handlebars.compile(this.manageFolderTemplateSrc)(this.folderItems);
		this.$manageFolder.html(mailBoxHtml);
		mailBox.toggleMailBoxView('manageFolders');

		var $manageFolderTree = this.$manageFolder.find('.folderTree');
		$manageFolderTree.find("ul").hide();                                                       
		$manageFolderTree.find("li").prepend("<span class='handle'></span>");
		$manageFolderTree.find("li:has(ul)").children(":first-child").addClass("collapsed").click(function() {    
			$(this).toggleClass("collapsed expanded").siblings("ul").toggle();
		});

		this.bindManageFolderEvents();
	},
	renderCustomFolderLeftmenu: function () {
		parent = this;
		var folderList = '';
		if(typeof this.folderItems !== 'undefined' && this.folderItems.length > 0) {
	        folderList += '<ul class="folderTree">';
	        $.each(this.folderItems, function () {
	            folderList += "<li data-folderId='"+this.folderId+"'>"+this.folderName;
	            if(typeof this.folders == 'object' && this.folders.length > 0) {
	               folderList += parent.getSubFoldersListing(this.folders, 1); 
	            }
	            folderList += "</li>";
	        })
	        folderList += '</ul>';
	        this.$leftMenuCustomFolder.html(folderList).show();

            var $leftMenuFolderTree = this.$leftMenuCustomFolder.find('.folderTree');
			$leftMenuFolderTree.find("ul").hide();                                                       
			$leftMenuFolderTree.find("li").prepend("<span class='handle'></span>");
			$leftMenuFolderTree.find("li:has(ul)").children(":first-child").addClass("collapsed").off('click').click(function(e) {    
				e.stopPropagation();
				$(this).toggleClass("collapsed expanded").siblings("ul").toggle();
			});

			var $leftMenuFolderTreeNav = $leftMenuFolderTree.find("li");
			$leftMenuFolderTreeNav.off('click').on('click', function (e) {
				e.preventDefault();
				e.stopPropagation();
				var folderId = $(this).attr('data-folderId');
				mailBox.changeMailBoxAndLoad(1, folderId);
				mailBox.$mailboxNav.removeClass('current');
				$leftMenuFolderTreeNav.removeClass('current');
				$(this).addClass('current'); //highlighting the current box
			});

    	} else {
    		this.leftMenuCustomFolder.hide();
    	}
	},
	getSubFoldersListing: function (folders, level) {
		folderSubFolderListings = '';
		parent = this;
	    if(level >= 4) {
	        return false;
	    } else if(folders.length > 0) {
	        folderSubFolderListings += " <ul>";
	        $.each(folders, function () {
	            folderSubFolderListings += "<li data-folderId='"+this.folderId+"'>"+this.folderName;
	            if(typeof this.folders == 'object' && this.folders.length > 0) {
	                folderSubFolderListings += parent.getSubFoldersListing(this.folders, level+1); 
	            }
	            folderSubFolderListings += "</li>";
	        })
	        folderSubFolderListings += " </ul>";
	    }
	    return folderSubFolderListings;
	},
	bindManageFolderEvents: function () {
		
		this.$makeNewFolderDiv = this.$manageFolder.find('.makeNewFolderDiv');

		this.$makeNewFolderDiv.find('.saveFolder').off('click').on('click', function () {
			manageFolder.saveFolder();
		});

		this.$makeNewFolderDiv.find('.cancelSaveFolder').off('click').on('click', function () {
			manageFolder.$makeNewFolderDiv.hide();
		});

		this.$manageFolder.find('.makeNewFolder').off('click').on('click', function () {
			manageFolder.$makeNewFolderDiv.toggle();
			manageFolder.ressetAddFolderForm();
		});

		var $manageFolderTree = manageFolder.$manageFolder.find('.folderTree');
		$manageFolderTree.find("img[data-actiontype='edit']").off('click').on('click', function () {
			var folderId = $(this).attr('data-folderId');
			if(folderId > 0 && typeof folderDetails[folderId] !== 'undefined') {
				manageFolder.$makeNewFolderDiv.show();
				manageFolder.$makeNewFolderDiv.find('input[name="folderName"]').val(folderDetails[folderId]['folderName']);
				manageFolder.$makeNewFolderDiv.find('input[name="folderId"]').val(folderId);
				manageFolder.$makeNewFolderDiv.find('select[name="folderLebel"]').val(folderDetails[folderId]['parentId']);
			} else {
				show_alert('Invalid folder Id.');
				$('#alertBtn').click(function() {
					hide_alert();
				});
			}

		})

		$manageFolderTree.find("img[data-actiontype='delete']").off('click').on('click', function () {
			var folderId = $(this).attr('data-folderId');
			if(folderId > 0) {
				manageFolder.deleteFolder(folderId);
			}
		})
	},
	ressetAddFolderForm: function () {
		this.$makeNewFolderDiv.find('input[name="folderName"]').val('');		
		this.$makeNewFolderDiv.find('input[name="folderId"]').val(0);
		this.$makeNewFolderDiv.find('select[name="folderLebel"]').val('');
	},
	deleteFolder: function (folderId) {
		if(typeof folderId !== 'undefined' && folderId > 0) {
			var parent = this;
			$.ajax({
				type: "POST",
				url: AJAX_PATH+"portal/mailbox.php",
				data: {action: 'delete_folder', folderId: folderId},
				success: function(res) {
					console.log(folderId);
					if(res.status == 1) {
						show_alert('Folder deleted successfully.');
						$('#alertBtn').click(function() {
							hide_alert();
						});
						parent.getFolderItems('refresh');
					} else if(res.status == 2) { // if the folder has mails inside it						
						show_confirm(res.msg);
						$("#confirmBtnYes").click(function() {
							hide_confirm();							
						});
						$("#confirmBtnNo").click(function() {
							hide_confirm();
						});
					} else {
						show_alert(res.msg);
						$('#alertBtn').click(function() {
							hide_alert();
						});
					}
				},
				dataType:'json'
			});
		} else {
			show_alert('Invalid folder Id.');
			$('#alertBtn').click(function() {
				hide_alert();
			});
		}
	},
	saveFolder: function () {
		var folderName = this.$makeNewFolderDiv.find('input[name="folderName"]').val();
		var folderId = this.$makeNewFolderDiv.find('input[name="folderId"]').val();
		var folderLebel = this.$makeNewFolderDiv.find('select[name="folderLebel"]').val();
		var parent = this;
		
		$.ajax({
			type: "POST",
			url: AJAX_PATH+"portal/mailbox.php",
			data: {action: 'save_folder', folderName: folderName, parentId: folderLebel, folderId: folderId},
			success: function(res) {				
				if(res.status == 1) {
					parent.getFolderItems('refresh');
				} else {
					var $ajaxResponseDiv = manageFolder.$manageFolder.find('.ajaxResponseDiv');
					$ajaxResponseDiv.html(res.msg);
				}
			},
			dataType:'json'
		});
	},
	getFolderItems: function (actionType) {
		var parent = this;
		$.ajax({
			type: "POST",
			url: AJAX_PATH+"portal/mailbox.php",
			data: {action: 'list_folder'},
			success: function(res) {
				parent.folderItems = res;

				parent.renderCustomFolderLeftmenu();

				if(typeof actionType !== 'undefined' && actionType == 'refresh') {
					parent.renderManageFolder();
				}
			},
			dataType:'json'
		});
	}
}

var manageRule = {
	windowPosition: {width: 800,top: 10,left: ((screen.availWidth / 2) - 400)},
	windowInitSettings: {title:'Manage Rule', icon:BASE_PATH+'_styles/_images/forms/email.png'},
	windowName: "manage_rule",
	init: function () {
		this.cacheDom();
		this.bindDefaultEvents();
	},
	cacheDom: function () {
		this.$mainContainer = $("#mainContentReplace");
		this.$mainContent = $("#mainContent");		
		this.$manageRuleNav = this.$mainContainer.find('.manageRuleNav');
		this.manageRuleTemplateSrc = $("#manageRule-template").html();
	},
	bindDefaultEvents: function () {
		this.$manageRuleNav.off('click').on('click', function () { manageRule.loadManageRuleWin() });
	},
	loadManageRuleWin: function () {
		var parent = this;
		$.ajax({
			type: "POST",
			url: AJAX_PATH+"portal/mailbox.php",
			data: {action: 'list_rules'},
			success: function(res) {
				parent.renderManageRuleWin(res);
			},
			dataType:'json'
		});
	},
	renderManageRuleWin: function (rules) {
		var win = null;
		if (dHTML.widgets[this.windowName]) {
    		win = dHTML.widgets[this.windowName];
    		win.content.innerHTML = '';
    	} else {
			win = new dWindow();
			win.name = this.windowName;
			dHTML.registerWidget(win);
			win.defaultposition = this.windowPosition;
			win.Init(this.windowInitSettings);
		}
		var data = {rules: rules, userList: composeMail.userList, folderList: manageFolder.folderItems};
		win.content.innerHTML = Handlebars.compile(this.manageRuleTemplateSrc)(data);
		blockBackground(1);
		win.container.style.zIndex = 1003;
		win.open();
		this.attachEvents();
	},
	attachEvents: function () {

		this.$manageRule = $("#manageRules");
		this.$makeNewRuleDiv = this.$manageRule.find('.makeNewRuleDiv');

		this.$makeNewRuleDiv.find('.saveRule').off('click').on('click', function () {
			manageRule.saveRule();
		});

		this.$makeNewRuleDiv.find('.cancelSaveRule').off('click').on('click', function () {
			manageRule.$makeNewRuleDiv.hide();
		});

		this.$manageRule.find('.makeNewRule').off('click').on('click', function () {
			manageRule.$makeNewRuleDiv.toggle();
			manageRule.ressetAddRuleForm();
		});

		var $manageRuleList = manageRule.$manageRule.find('.ruleList');

		$manageRuleList.find("img[data-actiontype='edit'], a[data-actiontype='edit'],").off('click')
		.on('click', function (e) {  
			var ruleId = $(this).attr('data-ruleId');
			e.preventDefault(e);
			manageRule.getRuleDetails(ruleId);
		})

		$manageRuleList.find("img[data-actiontype='delete']").off('click').on('click', function () {
			var ruleId = $(this).attr('data-ruleId');
			if(ruleId > 0) {
				manageRule.deleteRule(ruleId);
			}
		})

	},
	ressetAddRuleForm: function () {
		this.$makeNewRuleDiv.find('select[name="userId"]').val('');		
		this.$makeNewRuleDiv.find('input[name="ruleId"]').val(0);
		this.$makeNewRuleDiv.find('select[name="folderName"]').val('');
	},
	getRuleDetails: function (ruleId) {
		alert(ruleId)
		if(typeof ruleId !== 'undefined' && ruleId > 0) {
			$.ajax({
				type: "POST",
				url: AJAX_PATH+"portal/mailbox.php",
				data: {action: 'get_rule',ruleId: ruleId},
				success: function(res) {
					manageRule.$makeNewRuleDiv.show();
					manageRule.$makeNewRuleDiv.find('select[name="userId"]').val(res.sender_id);
					manageRule.$makeNewRuleDiv.find('input[name="ruleId"]').val(res.id);
					manageRule.$makeNewRuleDiv.find('select[name="folderName"]').val(res.folder_id);
				},
				dataType:'json'
			});
		} else {
			show_alert('Invalid folder Id.');
			$('#alertBtn').click(function() {
				hide_alert();
			});
		}
	},
	saveRule: function() {
		var userId = this.$makeNewRuleDiv.find('select[name="userId"]').val();
		var ruleId = this.$makeNewRuleDiv.find('input[name="ruleId"]').val();
		var folderId = this.$makeNewRuleDiv.find('select[name="folderName"]').val();
		var parent = this;
		
		$.ajax({
			type: "POST",
			url: AJAX_PATH+"portal/mailbox.php",
			data: {action: 'save_rule', folderId: folderId, senderId: userId, ruleId: ruleId},
			success: function(res) {				
				if(res.status == 1) {
					parent.loadManageRuleWin();
				} else {
					var $ajaxResponseDiv = $("#manageRules").find('.ajaxResponseDiv');
					$ajaxResponseDiv.html(res.msg).show();		
				}
			},
			dataType:'json'
		});
	},
	deleteRule: function (ruleId) {
		if(typeof ruleId !== 'undefined' && ruleId > 0) {
			var parent = this;
			$.ajax({
				type: "POST",
				url: AJAX_PATH+"portal/mailbox.php",
				data: {action: 'delete_rule', ruleId: ruleId},
				success: function(res) {
					console.log(ruleId);
					if(res.status == 1) {
						show_alert('Rule deleted successfully.');
						$('#alertBtn').click(function() {
							hide_alert();
						});
						parent.loadManageRuleWin();
					} else {
						show_alert(res.msg);
						$('#alertBtn').click(function() {
							hide_alert();
						});
					}
				},
				dataType:'json'
			});
		} else {
			show_alert('Invalid Rule Id.');
			$('#alertBtn').click(function() {
				hide_alert();
			});
		}
	},
}

//added a new commnet for triggring a new build
$(document).ready(function() {
	mailBox.init();
	composeMail.init();
	manageFolder.init();
	manageRule.init();
})

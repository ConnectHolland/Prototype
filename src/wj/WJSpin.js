/**
 * WJSpin 
 *
 * Javascript class that can perform ajax calls
 *
 * Changelog
 * ---------
 *
 * Ron Rademaker Mon Jan 05 2009
 * -----------------------------
 * - Added multi support
 * - Added root - prevents requests from having wrong callbacks
 *
 * @since Mon Jun 02 2008
 * @author Ron Rademaker
 **/

var WJSpin = Class.create({
	/**
	 * initialize
	 *
	 * Creates a new WJSpin
	 *
	 * @since Mon Jun 02 2008
	 * @access public
	 * @return void
	 **/
	initialize: function() {
		this.root = true;
		this.htmlelement = null;
		this.callbackfunctions = null;
		this.errorcallback = null;
		this.multi = false;
		this.spins = [];
		this._formObserver = null;
		this.formdata = null;
	},

	/**
	 * content
	 *
	 * Performs an ajax request to update, get or insert content
	 *
	 * @since Mon Jun 02 2008
	 * @access public
	 * @param WJUrl url
	 * @param Array callback
	 * @param Array errorcallback
	 * @return void
	 * @todo refactor
	 **/
	content: function(url, callback, errorcallback, method, rootSpin) {
		this._saveLastCall(arguments);
		var method = method || "post";
		if (this.root && this.multi) {
			if (!Object.isArray(callback) ) {
				throw new Error("Callback should be an array of elements and functions");
			}
			this.spins.push({url: url, callback: callback, errorcallback: errorcallback, method: method});
			return false;
		}
		else if (this.root) {
			var spin = new WJSpin();
			spin.root = false;
			return spin.content(url, callback, errorcallback, method, this);
		}
		else {
			if (!Object.isArray(callback) ) {
				throw new Error("Callback should be an array of elements and functions");
			}

			this._fillCallback(callback);
			if (typeof(errorcallback) == "function") {
				this.errorcallback = {"default": errorcallback};
			}
			else {
				this.errorcallback = errorcallback;
			}
			rootSpin.lastRequest = new Ajax.Request(url.getUrl(), {method: method, parameters: url.getParameters(), onSuccess: this.ajaxResponse.bind(this), onFailure: this.ajaxError.bind(this), onException: this.ajaxException.bind(this) });
			return true;
		}
	},
	
	/**
	 * form
	 *
	 * Starts observing a form for submit using WJSpin,
	 * Set callback to false, if you do not want to handle the response, please note that the form observer will be removed in all cases
	 *
	 * @since Mon Jun 06 2011
	 * @access public
	 * @param Element form
	 * @param Array callback
	 * @param Object errorcallback
	 * @return Element
	 **/
	form: function(form, callback, errorcallback) {
		this._formObserver = this._formSubmit.bindAsEventListener(this, form, callback, errorcallback);
		return $(form).observe("submit", this._formObserver);
	},
	
	/**
	 * _formSubmit
	 *
	 * Handles a submit that was observed through WJSpin.form()
	 *
	 * @since Mon Jun 06 2011
	 * @access protected
	 * @param Event event
	 * @param Element form
	 * @param Array callback
	 * @param Object errorcallback
	 * @return boolean
	 **/
	_formSubmit: function(event, form, callback, errorcallback) {
		if (form.getInputs("file").length > 0) {
			WJDebugger.log(WJDebugger.WARNING, "File uploads using WJSpin or not supported");
		}
		this.formdata = form.serialize(true);
		var element = event.element();
		if (callback === false) {
			callback = [];
		}
		else {
			callback = $A(callback);
			if (callback.length == 0) {
				callback.push(form.up() );
			}
			callback.unshift(function() { document.fire("form:beforeresult", {"wjspin": this}); }.bind(this) );
			callback.push(function() { document.fire("form:afterresult", {"wjspin": this}); }.bind(this) );
		}
		
		callback.push(function(form) {Event.stopObserving(form, "submit", this._formObserver);}.bind(this, form) );

		document.fire("form:beforesubmit", {"wjspin": this} );
		this.content(new WJUrl(this.formdata), callback, errorcallback, form.method);
		document.fire("form:aftersubmit", {"wjspin": this} );
		
		Event.stop(event);
		return false;
	},
	
	/**
	 * run
	 *
	 * Performs all set requests when multi, returns the number of performed requests
	 *
	 * @since Mon Jan 05 2009
	 * @access public
	 * @return integer
	 * @todo refactor
	 **/
	run: function() {
		if (this.multi) {
			if (this.spins.length == 0) {
				return 0;
			}
			var method = -1;
			for (var i = 0; i < this.spins.length; i++) {
				if (method == -1) {
					method = this.spins[i].method;
				}
				else if (method != this.spins[i].method) {
					WJDebugger.log(WJDebugger.WARNING, "Multispin with multiple request methods, using " + method);
				}
			}
			var url = -1;
			for (var i = 0; i < this.spins.length; i++) {
				if (url == -1) {
					url = this.spins[i].url.getUrl();
				}
				else if (url != this.spins[i].url.getUrl() ) {
					WJDebugger.log(WJDebugger.WARNING, "Multispin with multiple urls, using " + url);
				}
			}
			var parameters = {"requests": this.spins.length, "wmtrigger[]": ["multispin"]};
			this.errorcallback = new Array();
			for (var i = 0; i < this.spins.length; i++) {
				var spinpars = this.spins[i].url.getParameters();
				for (var key in spinpars) {
					if (key.match(/\[.*\]/) ) {
						parameters[key.replace(/([^\[]*)(\[.*)/, "$1[" + i + "]$2")] = spinpars[key];
					}
					else {
						parameters[key + "[" + i + "]"] = spinpars[key];
					}
				}
				this._fillCallback(this.spins[i].callback, i);
				errorcallback = this.spins[i].errorcallback;
				if (typeof(errorcallback) == "function") {
					this.errorcallback[i] = {"default": errorcallback};
				}
				else {
					this.errorcallback[i] = errorcallback;
				}
			}
			this.lastRequest = new Ajax.Request(url, {method: method, parameters: parameters, onSuccess: this.ajaxResponse.bind(this), onFailure: this.ajaxError.bind(this)});
			this.spins = new Array();
			return parameters.requests;
		}
		return 0;
	},

	/**
	 * saveLastCall
	 *
	 * Saves the function object that can be used to reproduce the last call
	 *
	 * @since Wed Feb 11 2009
	 * @access protected
	 * @param arguments args
	 * @return void
	 * @todo Find out how many times the last call was called again, to avoid infinitive loops
	 **/
	_saveLastCall: function(args) {
		var bindArgs = $A(args);
		bindArgs[0] = bindArgs[0].clone();
		this._lastCall = this.content.bind(new WJSpin() );
		this._lastCall.args = bindArgs;
	},

	/**
	 * setMulti
	 *
	 * Switches this spin to or from multi (ie. wraps multiple ajax calls in one to improve performance)
	 *
	 * @since Mon Jan 05 2009
	 * @access public
	 * @param boolean multi
	 * @return void
	 **/
	setMulti: function(multi) {
		this.multi = multi;
	},

	/**
	 * ajaxError
	 *
	 * Handles an unsuccesful ajax response
	 *
	 * @since Mon Jun 02 2008
	 * @access public
	 * @param Ajax.Request response
	 * @return void
	 * @todo refactor
	 **/
	ajaxError: function(response) {
		var called = false;
		if (this.multi) {
			// not good, call all error handlers
			for (var i = 0; i < this.errorcallback.length; i++) {
				if (typeof(this.errorcallback[i][response.status]) == "function") {
					this.errorcallback[i][response.status](response);
					called = true;
				}
				else if (typeof(this.errorcallback[i]["default"]) == "function") {
					this.errorcallback[i]["default"](response);
					called = true;
				}
			}
		}
		else if (this.errorcallback) {
			if (typeof(this.errorcallback[response.status]) == "function") {
				this.errorcallback[response.status](response, this._lastCall);
				called = true;
			}
			else if (typeof(this.errorcallback["default"]) == "function") {
				this.errorcallback["default"](response, this._lastCall);
				called = true;
			}
		}
		if (!called) {
			if (typeof(WJSpin.fallbackErrorCallback) == "function") {
				WJSpin.fallbackErrorCallback(response, this._lastCall);
			}
			else {
				WJDebugger.log(WJDebugger.WARNING, "Unhandled error in WJSpin", response);
			}
		}
	},

	/**
	 * ajaxException
	 *
	 * Log exceptions
	 *
	 * @since Fri Apr 13 2012
	 * @access public
	 * @return void
	 **/
	ajaxException: function(exception) {
		WJDebugger.log(WJDebugger.ERROR, "Exception while handling ajax response", exception);
	},

	/**
	 * fallbackErrorCallback
	 *
	 * Function called when no error callback is set and an error occurs
	 *
	 * @since Wed Jan 07 2009
	 * @access public
	 * @param response response
	 * @return void
	 **/
	fallbackErrorCallback: function(response) { 
		WJDebugger.log(WJDebugger.ERROR, "Unhandled error in WJSpin", response);
	},

	/**
	 * ajaxResponse
	 *
	 * Handles a succesful ajax request
	 *
	 * @since Mon Jun 02 2008
	 * @access public
	 * @param Ajax.Response response
	 * @return void
	 * @todo refactor
	 **/
	ajaxResponse: function(response) {
		if (this.multi) {
			if (response.getHeader("content-type").indexOf("xml") != -1) {
				this._multiResponse(response.responseXML);
			}
			else {
				WJDebugger.log(WJDebugger.ERROR, "Multispin not support for non-xml responses: " + response.getHeader("content-type") );
			}
		}
		else if (response.getHeader("content-type").indexOf("xml") != -1) {
			if (document.importNode && response.responseXML.documentElement.cloneNode(true) != null) {
				this._updateHtmlElementsWithXML(response.responseXML.documentElement.cloneNode(true) );
				this._callCallbacks(response.responseXML.documentElement.cloneNode(true).ownerDocument );
			}
			else if (response.responseXML.documentElement.xml != undefined) {
				this._updateHtmlElementsWithPlain(response.responseXML.documentElement.xml);
				this._callCallbacks(response.responseXML.cloneNode(true) );
			}
			else {
				this._updateHtmlElementsWithPlain(response.responseText);
				this._callCallbacks(response.responseText);
			}
		}
		else if (response.getHeader("content-type") == "application/json") {
			this._callCallbacks(response.responseJSON);
		}
		else {
			this._updateHtmlElementsWithPlain(response.responseText);
			this._callCallbacks(response.responseText);
		}
	},

	/**
	 * _multiResponse
	 *
	 * Handles a spin multi response 
	 *
	 * @since Tue Jan 06 2009
	 * @access protected
	 * @param Ajax.Response response
	 * @return void
	 * @todo refactor
	 **/
	_multiResponse: function(response) {
		var responses = response.getElementsByTagName("request");
		for (var i = 0; i < responses.length; i++) {
			var id = responses[i].getAttribute("id");
			var status = responses[i].getAttribute("status");
			var contenttype = responses[i].getAttribute("contentType");

			if ( (status >= 200) && (status < 400) ) {
				if (contenttype.indexOf("xml") != -1) {
					var reqResp = false;
					for (var j = 0; (j < responses[i].childNodes.length) && (!reqResp); j++) {
						if (responses[i].childNodes[j].nodeType == 1) {
							reqResp = responses[i].childNodes[j];
						}
					}
					if (document.importNode) {
						try {
							this._updateHtmlElementsWithXML(reqResp.cloneNode(true), id);
						}
						catch (e) {
							if (Prototype.Browser.IE && reqResp.xml) {
								this._updateHtmlElementsWithPlain(reqResp.xml, id); // fix wrong document error in IE9
							}
						}
					}
					else {
						this._updateHtmlElementsWithPlain(reqResp.xml, id);
					}
					
					this._callCallbacks(reqResp.cloneNode(true), id);
				}
				else if (contenttype == "application/json") {
					this._callCallbacks(responses[i].textContent, id);
				}
				else {
					this._updateHtmlElementsWithPlain(responses[i].getTextContent(), id);
					this._callCallbacks(responses[i].textContent, id);
				}
			}
			else {
				if (this.errorcallback[parseInt(id)]) {
					if (typeof(this.errorcallback[parseInt(id)][status]) == "function") {
						this.errorcallback[id][status](responses[i]);
					}
					else if (typeof(this.errorcallback[parseInt(id)]["default"]) == "function") {
						this.errorcallback[id]["default"](responses[i]);
					}
				}
			}
		}
	},

	/**
	 * _callCallbacks
	 *
	 * Calls all callback functions with the passed response (can be json, xml or plain text)
	 *
	 * @since Mon Jun 02 2008
	 * @access protected
	 * @param mixed response
	 * @param integer index
	 * @return void
	 **/
	_callCallbacks: function(response, index) {
		var callbacks = this.callback;
		if (this.multi) {
			callbacks = callbacks[index] || [];
		}
		for (var i = 0; i < callbacks.length; i++) {
			callbacks[i](response, this._lastCall);
		}
	},

	/**
	 * _updateHtmlElementsWithXML
	 *
	 * Updates the HTML with the contents in response (xml)
	 *
	 * @since Mon Jun 02 2008
	 * @access protected
	 * @param domnode response
	 * @param integer index
	 * @return void
	 **/
	_updateHtmlElementsWithXML: function(response, index) {
		var htmlelements = this.htmlelements;
		if (this.multi) {
			htmlelements = this.htmlelements[index];
		}
		for (var i = 0; i < htmlelements.length; i++) {
			htmlelements[i] = $(htmlelements[i]);
			var stub = new Element("div");
			if (response.documentElement) {
				stub.appendChild(htmlelements[i].ownerDocument.importNode(response.documentElement, true) );
			}
			else {
				stub.appendChild(htmlelements[i].ownerDocument.importNode(response, true) );
			}
			stub.innerHTML += "";
			var element = stub.firstDescendant();
			
			if (htmlelements[i].ajaxUpdateType == "replaceElement") {
				if (htmlelements[i].preserveId) {
					element.setAttribute("id", this.htmlelements[i].id);
				}
				htmlelements[i].replace(element);
			}
			else if (htmlelements[i].ajaxUpdateType == "prependChild") {
				htmlelements[i].insertBefore(element);
			}
			else if (htmlelements[i].ajaxUpdateType == "appendChild") {
				htmlelements[i].appendChild(element);
			}
			else {
				htmlelements[i].innerHTML = "";
				htmlelements[i].appendChild(element);
			}
			stub = null; // avoid possible memory leaks in IE
		}
	},

	/**
	 * _updateHtmlElementsWithPlain
	 *
	 * Updates the HTML with the contents in response (plain text)
	 *
	 * @since Mon Jun 02 2008
	 * @access protected
	 * @param text response
	 * @param integer index
	 * @return void
	 **/
	_updateHtmlElementsWithPlain: function(response, index) {
		for (el in WJSpin.closedElements) {
			response = response.replace(WJSpin.closedElements[el], "<$1$2/>");
		}
		var htmlelements = this.htmlelements;
		if (this.multi) {
			htmlelements = this.htmlelements[index];
		}
		for (var i = 0; i < htmlelements.length; i++) {
			if (htmlelements[i].ajaxUpdateType == "replaceElement") {
				var parent = htmlelements[i].parentNode;
				var id = false;
				if (htmlelements[i].preserveId) {
					var id = htmlelements[i].id;
				}

				htmlelements[i].replace(response);
				if (id) {
					htmlelements[i].id = id;
				}
				parent.innerHTML = parent.innerHTML;
			}
			else if (htmlelements[i].ajaxUpdateType == "prependChild") {
				htmlelements[i].innerHTML = response + htmlelements[i].innerHTML;
			}
			else if (this.htmlelements[i].ajaxUpdateType == "appendChild") {
				htmlelements[i].innerHTML = htmlelements[i].innerHTML + response;
			}
			else {
				htmlelements[i].innerHTML = response;
			}
			
			try {
				htmlelements[i].innerHTML.evalScripts();
			}
			catch (error) {
				// Otherwise Internet Exploder doesn't continue with execution of other javascript
			}
		}
	},

	/**
	 * update
	 *
	 * Performs an ajax request to do a cms function (the way windmill works allows you to update / get / insert content along with the cms actions)
	 *
	 * @since Mon Jun 02 2008
	 * @access public
	 * @param WJUrl url
	 * @param string module
	 * @param string func
	 * @param string data
	 * @param Array callback
	 * @param Array errorcallback
	 * @return void
	 **/
	update: function(url, module, func, data, callback, errorcallback) {
		var parameters = {};
		Object.extend(parameters, url.getParameters() || { });
		var _url = new WJUrl(parameters, url.getUrl() );
		_url.addParameter("__cms_" + module, "true");
		_url.addParameter("__function_" + module, func);
		for (var key in data) {
			_url.addParameter(key, data[key]);
		}

		return this.content(_url, callback, errorcallback);
	},

	/**
	 * _fillCallback
	 *
	 * Fills the callback and htmlelements array from the callback array
	 *
	 * @since Mon Jun 02 2008
	 * @access public
	 * @param Array callback
	 * @param integer index
	 * @return void
	 **/
	_fillCallback: function(callback, index) {
		if (!this.callback) {
			this.callback = new Array();
		}
		if (!this.htmlelements) {
			this.htmlelements = new Array();
		}
		if (index != undefined) {
			this.callback[index] = new Array();
			this.htmlelements[index] = new Array();
		}

		for (var i = 0; i < callback.length; i++) {
			if (Object.isFunction(callback[i]) ) {
				if (index != undefined) {
					this.callback[index].push(callback[i]);
				}
				else {
					this.callback.push(callback[i]);
				}
			}
			else if (Object.isElement(callback[i]) ) {
				if (index != undefined) {
					this.htmlelements[index].push(callback[i]);
				}
				else {
					this.htmlelements.push(callback[i]);
				}
			}
		}
	}
});

/**
 * The elements that should be closed when _updateHtmlElementsWithPlain is used
 *
 * @since Mon Oct 13 2008
 **/
WJSpin.closedElements = {};
["area", "base", "basefont", "br", "col", "frame", "hr", "img", "input", "isindex", "link", "meta", "param"].each(function(tag) {
	WJSpin.closedElements[tag] = new RegExp("<(" + tag + ")([^>]*)></\\1>", "gi");
});

/**
 * Short methods
 *
 * @since Mon Jun 06 2011
 **/
WJSpin.content = function(url, callback, errorcallback, method, rootSpin) {
	return new WJSpin().content(url, callback, errorcallback, method, rootSpin);
}
WJSpin.update = function(url, module, func, data, callback, errorcallback) {
	return new WJSpin().update(url, module, func, data, callback, errorcallback);
}
WJSpin.form = function(form, callback, errorcallback) {
	return new WJSpin().form(form, callback, errorcallback);
}

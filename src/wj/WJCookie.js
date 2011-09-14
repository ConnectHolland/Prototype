/**
 * WJCookie
 *
 * Javascript class for easy access to cookies
 *
 * @since Tue Oct 07 2008
 * @author Ron Rademaker
 **/
WJCookie = Class.create({
	/**
	 * initialize
	 *
	 * Creates a new WJCookie
	 *
	 * @since Tue Oct 07 2008
	 * @access public
	 * @param integer timeout
	 * @return void
	 **/
	initialize: function(timeout) {
		this._timeout = timeout || (25 * 60 * 60 * 365); // default time to a year
		this._seperator = "; ";
		this._replacement = "~~~~";  // this will cause problems when trying to save four ~ in a row
	},

	/**
	 * get
	 *
	 * Gets the value of key if available
	 *
	 * @since Tue Oct 07 2008
	 * @access public
	 * @param string key
	 * @param boolean json
	 * @return mixed
	 **/
	get: function(key, json) {
		if (json == null) {
			json = true;
		}
		var cookies = document.cookie.split(this._seperator);

		for (var i = 0; i < cookies.length; i++) {
			var cookie = cookies[i].split("=");
			if (cookie[0] == key) {
				if (json) {
					// unescapes the cookie value if evalJSON gives an error 
					try { 
						return cookie.slice(1).join("=").replace(this._replacement, this._seperator).evalJSON(true);
					}
					catch (e) { 
						var value = unescape(cookie.slice(1).join("=").replace(this._replacement, this._seperator) );
						return value.evalJSON(true);
					}
				}
				else {
					return cookie.slice(1).join("=").replace(this._replacement, this._seperator);
				}
			}
		}
	},

	/**
	 * set 
	 *
	 * Sets the value of key to value
	 *
	 * @since Tue Oct 07 2008
	 * @access public
	 * @param string key
	 * @param mixed value
	 * @param boolean json
	 * @return void
	 **/
	set: function(key, value, json) {
		if (json == null) {
			json = true;
		}
		var tostore = json ? Object.toJSON(value) : value;
		document.cookie = key + "=" + tostore.replace(this._seperator, this._replacement) + this._seperator + this._getExpires() + this._seperator + "path=/";
	},

	/**
	 * _getExpires
	 *
	 * Gets the expires value for the current date and time
	 *
	 * @since Tue Oct 07 2008
	 * @access protected
	 * @return string
	 **/
	_getExpires: function() {
		var date  = new Date();
		date.setTime(date.getTime() + (this._timeout * 1000) );
		return "expires=" + date.toGMTString();
	},
	
	/**
	 * unset
	 *
	 * Deletes the value stored under key from the cookies
	 *
	 * @since Fri May 7 2010
	 * @access public
	 * @param string key
	 * @return void
	 **/
	unset: function(key) {
		return WJCookie.unset(key);
	}
});

/**
 * test
 *
 * Function to validate cookies can be set (note: javascript must (offcourse) be enabled to do this check)
 *
 * @since Fri May 7 2010
 * @access public
 * @param mixed errorCallback
 * @return boolean
 **/
WJCookie.test = function(errorCallback) {
	var wjcookie = new WJCookie();
	wjcookie.set("___wjcookietest", true, true);
	if (!wjcookie.get("___wjcookietest", true) ) {
		if (Object.isFunction(errorCallback) ) {
			errorCallback();
		}
		return false;
	}
	wjcookie.unset("___wjcookietest");
	return true;
};

/**
 * unset
 *
 * Deletes the value stored under key from the cookies
 *
 * @since Fri May 7 2010
 * @access public
 * @param string key
 * @return void
 **/
WJCookie.unset = function(key) {
	new WJCookie( (0 - (new Date().getTime() / 1000) ) ).set(key, "", false);
};

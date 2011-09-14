new Test.Unit.Runner({
	setup: function() {
		$("content").update("");

		this.oldFunc = Ajax.Base.prototype.initialize;
		Ajax.Base.prototype.initialize = Ajax.Base.prototype.initialize.wrap(
			function(original, options) {
				options["method"] = "get";
				original(options);

			}
		); // Rake doesn't work with "post" and for this test the method is not important
	},

	teardown: function() {
		Ajax.Base.prototype.initialize = this.oldFunc;
	},

	testMultispin: function() {
		var wjspin = new WJSpin();
		wjspin.setMulti(true);


		wjspin.content(new WJUrl({"foo": "bar"}, "../fixtures/multi.xml"), [$("content")]);
		wjspin.content(new WJUrl({"foobar": "bar"}, "../fixtures/multi.xml"), [function(s) { this.assert(true); }.bind(this)], function(s) { this.assert(false); }.bind(this) ); // check callback
		wjspin.content(new WJUrl({"foobar": "bar"}, "../fixtures/multi.xml"), [function(s) { this.assert(false); }.bind(this)], function(s) { this.assert(true) }.bind(this) ); // check error callback
		wjspin.content(new WJUrl({"foobar": "baz", "foo": "bar"}, "../fixtures/multi.xml"), [function(s) { r = s.evalJSON(); this.assertEqual("bar", r.foo); }.bind(this)]);

		this.assertEqual(wjspin.run(), 4);
		this.assertEqual(wjspin.run(), 0); // make sure there are no double requests
		this.wait(1000, function() {
			this.assertEqual("<h1>hello world</h1>", $("content").innerHTML.toLowerCase() ); // check update
		});
	},

	testAjaxUpdateTypeDefault: function() {
		this.assertEqual("", $("content").innerHTML);

		var wjurl = new WJUrl({}, "../fixtures/content.html");
		var wjspin = new WJSpin();

		wjspin.content(wjurl, [$("content")] );
		this.wait(1000, function() {
			this.assertEqual(sentence, $("content").innerHTML.strip().toLowerCase());
		});

	},

	testAjaxUpdateTypePrependChild: function() {
		var wjurl = new WJUrl({}, "../fixtures/content.html");
		var wjspin = new WJSpin();

		$("content").update("Around and around.");
		$("content").ajaxUpdateType = "prependChild";
		wjspin.content(wjurl, [$("content")] );
		this.wait(1000, function() {
			this.assertEqual(sentence + "around and around.", $("content").innerHTML.strip().toLowerCase());
		});
	},

	testAjaxUpdateTypeAppendChild: function() {
		var wjurl = new WJUrl({}, "../fixtures/content.html");
		var wjspin = new WJSpin();

		$("content").update("The ");
		$("content").ajaxUpdateType = "appendChild";
		wjspin.content(wjurl, [$("content")] );
		this.wait(1000, function() {
			this.assertEqual("the " + sentence, $("content").innerHTML.strip().toLowerCase());
		});

	},

	testAjaxUpdateTypeUpdate: function() {
		var wjurl = new WJUrl({}, "../fixtures/content.html");
		var wjspin = new WJSpin();

		$("content").ajaxUpdateType = "update";
		wjspin.content(wjurl, [$("content")] );
		this.wait(1000, function() {
			this.assertEqual(sentence, $("content").innerHTML.strip().toLowerCase());
		});
	},

	testAjaxUpdateTypeReplaceElement: function() {
		var wjurl = new WJUrl({}, "../fixtures/hello.js");
		var wjspin = new WJSpin();

		$("content").update("<div>...</div>");
		var child = $("content").firstChild;
		child.ajaxUpdateType = "replaceElement";

		wjspin.content(wjurl, [child] );
		this.wait(1000, function() {
			this.assertEqual(false, Object.isElement(child.parentNode) );
			var h2 = $("content").firstChild;
			this.assertEqual("Hello world!", h2.innerHTML);
		});
	},

	testDoubleAction: function() {
		var wjurl = new WJUrl({}, "../fixtures/hello.js");
		var wjspin = new WJSpin();
		var obj = {
			returnval: null,
			testFunc: function(response) {
				this.returnval = response.content;
			}
		};

		$("content").update("");
		$("content").ajaxUpdateType = "update";
		wjspin.content(wjurl, [$("content"), obj.testFunc.bind(obj)] );
		this.wait(1000, function() {
			var h2 = $("content").firstChild;
			this.assertEqual("Hello world!", h2.innerHTML);
			this.assertNotNull(obj.returnval);
		});
	},

	testNotFound: function() {
		var wjurl = new WJUrl({}, "/notfound.html");
		this.assertEqual("/notfound.html", wjurl.getUrl() );
		var wjspin = new WJSpin();
		var errorFunc = function(response) {
			$("content").update("called because of " + response.status);
		};

		$("content").update("");
		$("content").ajaxUpdateType = "update";
		wjspin.content(wjurl, [$("content")], {"default": errorFunc});
		this.wait(1000, function() {
			this.assertEqual("called because of 404", $("content").innerHTML);
		});

		$("content").update("");
		$("content").ajaxUpdateType = "update";
		wjspin.content(wjurl, [$("content")], {404: errorFunc});
		this.wait(1000, function() {
			this.assertEqual("called because of 404", $("content").innerHTML);
		});
	},

	testErrorCallback: function() {
		var wjurl = new WJUrl({}, "/notfound.html");
		this.assertEqual("/notfound.html", wjurl.getUrl() );
		var wjspin = new WJSpin();
		var obj = {
			called: 0,
			status: null,
			errorFunc: function(response) {
				this.called++;
				this.status = response.status;
			}
		};

		$("content").update("");
		$("content").ajaxUpdateType = "update";
		wjspin.content(wjurl, [$("content")], {"default": obj.errorFunc.bind(obj), 404: obj.errorFunc.bind(obj)});
		this.wait(1000, function() {
			this.assertEqual("", $("content").innerHTML);
			this.assertEqual(1, obj.called);
			this.assertEqual("404", obj.status);
		});
	},

	testRedoLastCall: function() {
		var wjurl = new WJUrl({}, "../fixtures/content.html");
		this.assertEqual("../fixtures/content.html", wjurl.getUrl() );
		var wjspin = new WJSpin();
		var obj = {
			called: 0,
			status: null,
			wasCalledAgain: false,
			parent: this,
			responseFunc: function(response, lastCall) {
				this.parent.assert( (typeof(lastCall) == "function"), "The lastCall argument isn't a function");
				this.called++;
				
				if (!this.wasCalledAgain) {
					this.wasCalledAgain = true;
					lastCall();
				}
			}
		};
		this.assertEqual(false, obj.wasCalledAgain);

		$("content").update("");
		$("content").ajaxUpdateType = "update";
		wjspin.content(wjurl, [obj.responseFunc.bind(obj)], {});
		this.wait(1000, function() {
			this.assertEqual(obj.called, 2, "There not exactly 2 calls: " + obj.called) ;
			this.assertEqual(true, obj.wasCalledAgain);
		});
	},
	
	testUpdate: function() {
		var wjurl = new WJUrl({}, "../fixtures/content.html");
		var wjspin = new WJSpin();

		$("content").update("");
		$("content").ajaxUpdateType = "update";

		wjspin.update(wjurl, "Wmparagraph", "update", {id: 1, titel: "Hoi wereld"}, [$("content")] );
		this.wait(1000, function() {
			this.assertUndefined(wjurl.getParameter("id") );
			this.assertEqual(sentence, $("content").innerHTML.strip().toLowerCase() );
		});
	},

	testUpdateGetElementBy$: function() {
		var wjurl = new WJUrl({}, "../fixtures/dom.html");
		var wjspin = new WJSpin();

		$("content").update("");
		$("content").ajaxUpdateType = "update";

		wjspin.content(wjurl, [$("content")] );
		this.wait(1000, function() {
			this.assertEqual("container", $("container").id);
		});
	},

	testJSONResponse: function() {
		var wjurl = new WJUrl({}, "../fixtures/dom.html");
		var wjspin = new WJSpin();
		var func = function(response) {
			this.response = response;
		}
		$("content").update("");
		$("content").ajaxUpdateType = "update";

		wjspin.content(wjurl, [$("content")] );
		this.wait(1000, function() {
			this.assertEqual("container", $("container").id);
		});
	},

	testNonArrayCallback: function() {
		var wjurl = new WJUrl();
		var wjspin = new WJSpin();
		var error = false;

		try {
			wjspin.content(wjurl, $("content") );
		}
		catch (e) {
			error = true;
		}
		this.wait(1000, function() {
			this.assert(error);
		});
	}

});

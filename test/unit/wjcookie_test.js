new Test.Unit.Runner({
	setup: function() {
		this.cookie = new WJCookie();
	},

	testCookies: function() {
		this.assert(WJCookie.test(), "COOKIES SHOULD BE ENABLED FOR THIS TEST TO RUN");
	},

	testSetString: function() {
		this.cookie.set("foo", "bar");

		var value = this.cookie.get("foo");
		this.assertEqual("bar", value);
	},

	testSetObject: function() {
		this.cookie.set("foo", {"bar": "foobar"});

		var value = this.cookie.get("foo");
		this.assertEqual("foobar", value.bar);
	},

	testStringWithIs: function() {
		this.cookie.set("foo", {"bar": "foo=bar"});

		var value = this.cookie.get("foo");
		this.assertEqual("foo=bar", value.bar);
	},

	testStringWithSemiColon: function() {
		this.cookie.set("foo", {"bar": "foo; bar"});

		var value = this.cookie.get("foo");
		this.assertEqual("foo; bar", value.bar);
	},

	testNoJson: function() {
		this.cookie.set("foo", "bar", false);

		var value = this.cookie.get("foo", false);
		this.assertEqual("bar", value);
	}
});

new Test.Unit.Runner({
	setup: function() {
		this.cookie = new WJCookie();
	},

	testSetString: function() {
		this.cookie.set("foo", "bar");

		var value = this.cookie.get("foo");
		this.assertEqual(value, "bar");
	},

	testSetObject: function() {
		this.cookie.set("foo", {"bar": "foobar"});

		var value = this.cookie.get("foo");
		this.assertEqual(value.bar, "foobar");
	},

	testStringWithIs: function() {
		this.cookie.set("foo", {"bar": "foo=bar"});

		var value = this.cookie.get("foo");
		this.assertEqual(value.bar, "foo=bar");
	},

	testStringWithSemiColon: function() {
		this.cookie.set("foo", {"bar": "foo; bar"});

		var value = this.cookie.get("foo");
		this.assertEqual(value.bar, "foo; bar");
	},

	testNoJson: function() {
		this.cookie.set("foo", "bar", false);

		var value = this.cookie.get("foo", false);
		this.assertEqual(value, "bar");
	}
});

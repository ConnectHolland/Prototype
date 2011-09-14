/**
 * WJDebugger 
 *
 * Javascript class that handles errors and notices
 *
 * @since Mon Aug 04 2008
 * @author Giso Stallenberg
 **/
var WJDebugger = {
	SILENT: 0,
	ERROR: 1,
	WARNING: 2,
	NOTICE: 3,
	INFO: 4,
	DEBUG: 5
};

WJDebugger.verbosity = WJDebugger.SILENT; // default verbosity (do not display any info)

WJDebugger.log = function(level) {
	if (isNaN(level) || level > WJDebugger.verbosity) {
		return;
	}
	var args = $A(arguments);
	args.shift();
	if (typeof(console) != "undefined" && typeof(console.error) == "function" && typeof(console.warn) == "function" && typeof(console.log) == "function") {
		switch (level) {
			case WJDebugger.ERROR:
				console.error.apply(console, args);
				break;
			case WJDebugger.WARNING:
				console.warn.apply(console, args);
				break;
			default:
				console.log.apply(console, args);
				break;
		}
	}
	else {
		// TODO: handle FF firebug extension missing
		// alert(args);
	}
}

WJDebugger.stack = function(level) {
	if (isNaN(level) || level > WJDebugger.verbosity) {
		return;
	}
	try {
		throw new Error("stack");
	}
	catch(e) {
      var stack = (e.stack || '').match(arguments.callee.regex).reject(function(path) {
        return /(prototype|eprototype([a-z][a-z]_[A-Z][A-Z])|unittest|update_helper)\.js/.test(path);
      }).join("\n");

		WJDebugger.log(level, stack);
		throw e;
	}
}
WJDebugger.stack.regex = new RegExp("@" + window.location.protocol + ".*?\\d+\\n", "g");

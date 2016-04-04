module.exports = function (delimiter) {
	return function (text) {
		return text.split(delimiter).map(function (item) {
			return item.trim();
		});
	};
};

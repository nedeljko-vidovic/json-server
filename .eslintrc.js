module.exports = {
	extends: ['standard', 'prettier'],
	plugins: ['prettier'],
	rules: {
		"indent": [
			"error",
			"tab"
		],
		"linebreak-style": [
			"error",
			"windows"
		],
		"quotes": [
			"error",
			"double"
		],
		"semi": [
			"error",
			"always"
		],
		"no-console": 0
	},
	env: { mocha: true }
}

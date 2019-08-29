module.exports = function (config) {
  config.set({
    basePath: '..',
    frameworks: ['mocha', 'karma-typescript'],
    reporters: ['mocha', 'karma-typescript'],
    files: [
      { pattern: "tests/src/**/*.ts" },
      { pattern: "src/**/*.ts" },
    ],
    port: 9876,
    colors: true,
    singleRun: true,
    logLevel: config.LOG_DEBUG,

    preprocessors: {
      '**/*.ts': ['karma-typescript']
    },

    karmaTypescriptConfig: {
      tsconfig: 'tests/tsconfig.json',
      coverageOptions: {
        instrumentation: true
      },
      reports: {
        "text-summary": "",
        "html": "coverage",
        "lcovonly": {
          "directory": "coverage",
          "filename": "coverage.lcov"
        }
      },
      bundlerOptions: {
        acornOptions: {
          ecmaVersion: 8,
        },
        transforms: [
          require("karma-typescript-es6-transform")({
            presets: [
              ["env", {
                targets: {
                  browsers: ["last 2 Chrome versions"]
                },
              }]
            ]
          })
        ]
      }
    }
  });
};

var gulp = require('gulp');
var runSequence = require('run-sequence');
var changed = require('gulp-changed');
var to5 = require('gulp-babel');
var paths = require('../paths');
var compilerOptions = require('../babel-options');
var assign = Object.assign || require('object.assign');
var less = require('gulp-less');
var minifyCSS = require('gulp-minify-css');
var es = require('event-stream');
var through2 = require('through2');
var concat = require('gulp-concat');
var insert = require('gulp-insert');
var rename = require('gulp-rename');
var tools = require('aurelia-tools');
var del = require('del');
var vinylPaths = require('vinyl-paths');
var gulpIgnore = require('gulp-ignore');

var jsName = paths.packageName + '.js';

function removeDTSPlugin(options) {
  var found = options.plugins.find(function(x){
    return x instanceof Array;
  });

  var index = options.plugins.indexOf(found);
  options.plugins.splice(index, 1);
  return options;
}

gulp.task('build-index', function(){
  var importsToAdd = [];
  var files = [
    'dialog-options.js',
    'dialog-result.js',
    'ai-dialog-body.js',
    'ai-dialog-footer.js',
    'ai-dialog-header.js',
    'ai-dialog.js',
    'attach-focus.js',
    'lifecycle.js',
    'dialog-controller.js',
    'renderer.js',
    'dialog-renderer.js',
    'dialog-service.js',
    'dialog-configuration.js',
    'aurelia-dialog.js'
    ].map(function(file){
      return paths.root + file;
    });

  return gulp.src(files)
    .pipe(gulpIgnore.exclude('aurelia-dialog.js'))
    .pipe(through2.obj(function(file, enc, callback) {
      file.contents = new Buffer(tools.extractImports(file.contents.toString("utf8"), importsToAdd));
      this.push(file);
      return callback();
    }))
    .pipe(concat(jsName))
    .pipe(insert.transform(function(contents) {
      return tools.createImportBlock(importsToAdd) + contents;
    }))
    .pipe(gulp.dest(paths.output));
});

gulp.task('build-es2015-temp', function () {
  return gulp.src(paths.output + jsName)
    .pipe(to5(assign({}, compilerOptions.commonjs())))
    .pipe(gulp.dest(paths.output + 'temp'));
});

gulp.task('build-es2015', function () {
  return gulp.src(paths.source)
    .pipe(to5(assign({}, removeDTSPlugin(compilerOptions.es2015()))))
    .pipe(gulp.dest(paths.output + 'es2015'));
});

gulp.task('build-commonjs', function () {
  return gulp.src(paths.source)
    .pipe(to5(assign({}, removeDTSPlugin(compilerOptions.commonjs()))))
    .pipe(gulp.dest(paths.output + 'commonjs'));
});

gulp.task('build-amd', function () {
  return gulp.src(paths.source)
    .pipe(to5(assign({}, removeDTSPlugin(compilerOptions.amd()))))
    .pipe(gulp.dest(paths.output + 'amd'));
});

gulp.task('build-system', function () {
  return gulp.src(paths.source)
    .pipe(to5(assign({}, removeDTSPlugin(compilerOptions.system()))))
    .pipe(gulp.dest(paths.output + 'system'));
});

gulp.task('build-dts', function(){
  return gulp.src(paths.output + paths.packageName + '.d.ts')
    .pipe(rename(paths.packageName + '.d.ts'))
    .pipe(gulp.dest(paths.output + 'es2015'))
    .pipe(gulp.dest(paths.output + 'commonjs'))
    .pipe(gulp.dest(paths.output + 'amd'))
    .pipe(gulp.dest(paths.output + 'system'));
});

gulp.task('build-css', function () {
  return gulp.src(paths.styleSource)
    .pipe(less())
    .pipe(minifyCSS({ keepBreaks: false }))
    .pipe(rename('output.css'))
    .pipe(gulp.dest(paths.styleOutput));
});

gulp.task('build', function(callback) {
  return runSequence(
    'clean',
    'build-index',
    ['build-es2015-temp', 'build-commonjs', 'build-amd', 'build-system', 'build-es2015', 'build-css'],
    'build-dts',
    callback
  );
});

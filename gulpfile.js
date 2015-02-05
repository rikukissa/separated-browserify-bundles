'use strict';

var _ = require('lodash');
var browserify = require('browserify');
var es = require('event-stream');
var gulp = require('gulp');
var gutil = require('gulp-util');
var source = require('vinyl-source-stream');

var nodeResolve = require('resolve');
var bowerResolve = require('bower-resolve');

var config = {
  scripts: {
    source: './src/js/main.js',
    destination: './public/js/',
    filename: 'bundle.js',
    vendorFilename: 'vendor.js'
  }
};

/*
 * Returns the keys of dependencies in given *.json file
 */

function getDependencyIds(manager) {
  var manifest = require('./' + manager + '.json');
  return _.keys(manifest.dependencies) || [];
}

/*
 * Returns all project dependencies in {name: path} object
 */

function getDependencies () {

  var bowerDeps = getDependencyIds('bower').reduce(function(memo, id) {
    memo[id] = bowerResolve.fastReadSync(id);
    return memo;
  }, {});

  var npmDeps = getDependencyIds('package').reduce(function(memo, id) {
    memo[id] = nodeResolve.sync(id);
    return memo;
  }, {});

  return _.extend({}, bowerDeps, npmDeps);
}

function handleError(err) {
  gutil.log(err);
  gutil.beep();
  return this.emit('end');
}

gulp.task('build', function() {

  var vendorBundle = browserify();

  var appBundle = browserify({
    entries: [config.scripts.source],
    extensions: config.scripts.extensions,
    debug: false
  });

  var dependencies = getDependencies();

  for(var id in dependencies) {
    var path = dependencies[id];
    vendorBundle.require(path, {expose: id});
    appBundle.external(id);
  }

  return es.merge(
    vendorBundle.bundle()
      .pipe(source(config.scripts.vendorFilename)),

    appBundle.bundle()
      .pipe(source(config.scripts.filename))
  )
  .on('error', handleError)
  .pipe(gulp.dest(config.scripts.destination));

});

gulp.task('default', ['build']);

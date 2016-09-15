'use strict';

var fs = require('fs');
var gulp = require('gulp');
var sass = require('gulp-sass');

gulp.task('sass', function () {
    return gulp.src('./assets/sass/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./assets/css/'));
});

gulp.task('sass:watch', function () {
    gulp.watch('./assets/sass/**/*.scss', _tasks);
});

var _tasks = ['sass'];
var _watch_tasks = ['sass:watch'];

gulp.task('default', _tasks);
gulp.task('watch', _watch_tasks);

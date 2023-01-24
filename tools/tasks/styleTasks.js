/* eslint-disable */
'use strict';

module.exports = function(gulp, config) {
    const sourcemaps = require('gulp-sourcemaps');
    const less = require('gulp-less');
    const autoprefixer = require('gulp-autoprefixer');
    const cleanCSS = require('gulp-clean-css');
    const concat = require('gulp-concat');
    const OPTIONS = config;

    const buildStyles = () => gulp.src(OPTIONS.FILE.CSS_MAIN)
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(autoprefixer({
            cascade: false,
            overrideBrowserslist: ['last 2 versions'],
        }))
        .pipe(cleanCSS({compatibility: 'ie11'}))
        .pipe(concat('main.min.css'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(OPTIONS.DIR.DIST_STYLE));

    gulp.task(OPTIONS.TASKS.BUILD.STYLES, buildStyles);
    gulp.task(OPTIONS.TASKS.WATCH.STYLES, () => {
        gulp.watch(OPTIONS.GLOB.LESS).on('change', () => buildStyles());
    });
};

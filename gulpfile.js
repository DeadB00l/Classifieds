/// <binding BeforeBuild='default' ProjectOpened='watch' />
/*
This file in the main entry point for defining Gulp tasks and using Gulp plugins.
Click here to learn more. http://go.microsoft.com/fwlink/?LinkId=518007
*/

var gulp = require('gulp');

// Include Our Plugins
var jshint = require('gulp-jshint');
var fs = require('fs');
var gulpIgnore = require('gulp-ignore');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var minifyCSS = require('gulp-minify-css');
var minifyJS = require('gulp-minify');
var sourcemaps = require('gulp-sourcemaps');
var jeditor = require('gulp-json-editor');
var assemblyInfo = require('gulp-dotnet-assembly-info');
var pump = require('pump');

var jsPathStr = 'SiteAssets/js';
var cssPathStr = 'SiteAssets/css';
var htmlPathStr = 'SiteAssets/html';
var finalDestStr = 'SiteAssets/src';
gulp.task('default', ['createAppVersion', 'assemblyInfo', 'html', 'sass', 'compress']);

gulp.task("html", function () {
    return gulp.src(htmlPathStr + "/*.html")
        .pipe(gulp.dest(finalDestStr));
});

gulp.task('createAppVersion', function () {
    var date = new Date();
    version = (date.getFullYear() + "." + ("0" + (date.getMonth() + 1)).slice(-2) + "." + ("0" + date.getDate()).slice(-2) + "." + ("0" + date.getHours()).slice(-2) + ("0" + date.getMinutes()).slice(-2));

    return gulp.src('./appversion.json')
        .pipe(jeditor({
            'version': version
        }))
        .pipe(gulp.dest('.'));
});

gulp.task('assemblyInfo', function () {
    var appversion = JSON.parse(fs.readFileSync('./appversion.json'));

    return gulp.src('**/AssemblyInfo.cs')
        .pipe(assemblyInfo({
            fileVersion: function (value) {
                return appversion.version;
            }
        }))
        .pipe(gulp.dest('.'));
});

// Lint Task
gulp.task('lint', function () {
    return gulp.src(jsPathStr + "/*.js")
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// Compile Our Sass
gulp.task('sass', function () {
    return gulp.src(cssPathStr + "/*.scss")
        .pipe(sass())
        .pipe(gulp.dest(cssPathStr))
        .pipe(minifyCSS())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(finalDestStr));
});

//Minify JS
gulp.task('js', function () {
    return gulp.src([jsPathStr + '/*.js', '!' + jsPathStr + '/*.min.js'])
        .pipe(uglify())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(finalDestStr));
});

gulp.task('compress', function (cb) {
    return gulp.src(jsPathStr + '/*.js')
    .pipe(minifyJS({
        ext:{
            src:'-debug.js',
            min:'.min.js'
        },
        exclude: ['tasks'],
        ignoreFiles: ['.combo.js', '-min.js']
    }))
    .pipe(gulp.dest(finalDestStr))
  });

// Watch Files For Changes
/*
gulp.task('watch', function () {
    gulp.watch(jsPathStr + '/*.js', ['lint', 'scripts']);
    gulp.watch(cssPathStr + '/*.scss', ['sass']);
});
*/
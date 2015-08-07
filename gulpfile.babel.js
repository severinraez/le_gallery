/**
 *
 *  TWY Asset-Pipeline
 *
 *  Copyright 2015 TWY GmbH. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */

import gulp from "gulp";
import gulpLoadPlugins from "gulp-load-plugins";
import del from "del";
import spritesmith from "gulp.spritesmith";
import minimist from "minimist";
import browserSync from "browser-sync";
//import styleguide from "sc5-styleguide";

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

/*******************************************************************************************
 *  Commandline parameters
 *******************************************************************************************/
const knownOptions = {
  string: "env",
  default: {env: process.env.NODE_ENV || "prod"}
};

const options = minimist(process.argv.slice(2), knownOptions);

/*******************************************************************************************
 *  Helper functions
 *******************************************************************************************/
let isProduction = () => {
  return options.env === "prod";
};

let isDevelopment = () => {
  return options.env === "dev";
};

/*******************************************************************************************
 *  Directories
 *******************************************************************************************/
const dirs = {
  src: "./app",
  dest: "./public",
  bower: "./bower_components"
};

const cssFolder = "/styles";
const jsFolder = "/scripts";
const imgFolder = "/images";
const fontFolder = "/fonts";

const cssPaths = {
  src: `${dirs.src}/${cssFolder}`,
  dest: `${dirs.dest}/${cssFolder}`
};

const jsPaths = {
  src: `${dirs.src}/${jsFolder}`,
  dest: `${dirs.dest}/${jsFolder}`
};

const imgPaths = {
  src: `${dirs.src}/${imgFolder}`,
  dest: `${dirs.dest}/${imgFolder}`
};

const fontPaths = {
  src: `${dirs.src}/icons`,
  dest: `${dirs.dest}/${fontFolder}`
};

const imageOptimizationOptions = {
  optimizationLevel: 5
};

/*******************************************************************************************
 *  Tasks
 *******************************************************************************************/

/**
 * Clean the slate
 */
gulp.task("clean", (cb) => {
  del([
    cssPaths.dest,
    jsPaths.dest,
    imgPaths.dest
  ], cb);
});

/**
 * Compiling Sass to Css
 * TODO: Add autoprefixer
 */
gulp.task("styles", () => {
  return gulp.src([`${cssPaths.src}/style.scss`])
    .pipe($.plumber({errorHandler: $.notify.onError("Error: <%= error %>")}))
    .pipe($.if(isDevelopment(), $.sourcemaps.init()))
    .pipe($.sass({
      includePaths: [
        `${dirs.bower}/normalize-scss`,
        `${dirs.bower}/bourbon/dist`,
        `${dirs.bower}/susy/sass`,
        `${dirs.bower}/breakpoint-sass/stylesheets`
      ]
    }))
    .pipe($.if(isDevelopment(), $.sourcemaps.write()))
    .pipe($.if(isProduction(), $.rename({suffix: ".min"})))
    .pipe($.if(isProduction(), $.minifyCss()))
    .pipe($.cssSelectorLimit({limit: 2000}))
    .pipe($.cssSelectorLimit.reporter("default"))
    .pipe($.cssSelectorLimit.reporter("fail"))
    .pipe($.size({title: "css: normal"}))
    .pipe($.size({title: "css: gziped", gzip: true}))
    .pipe(gulp.dest(cssPaths.dest))
    .pipe(browserSync.stream());
});

/**
 * Compile and concatenate scripts
 */
gulp.task("scripts", () => {
  return gulp.src(`${jsPaths.src}/**/*.coffee`)
    .pipe($.plumber())
    .pipe($.if(isDevelopment(), $.sourcemaps.init()))
    .pipe($.coffee())
    .pipe($.concat("app.js"))
    .pipe($.if(isDevelopment(), $.sourcemaps.write()))
    .pipe($.if(isProduction(), $.rename({suffix: ".min"})))
    .pipe($.if(isProduction(), $.uglify()))
    .pipe(gulp.dest(jsPaths.dest)).on("error", $.util.log);
});

// Compile vendor scripts into one file
gulp.task("scripts-vendors", () => {
  console.log(`${dirs.bower}/angular/angular.js`);
  return gulp.src([
    `${dirs.bower}/angular/angular.js`,
  ])
    .pipe($.concat("vendor.js"))
    .pipe($.if(isProduction(), $.rename({suffix: ".min"})))
    .pipe($.if(isProduction(), $.uglify()))
    .pipe(gulp.dest(jsPaths.dest));
});

// Concatenate app and vendors
gulp.task("scripts-concat", () => {
  return gulp.src([
    `${jsPaths.dest}/vendor.min.js`,
    `${jsPaths.dest}/app.min.js`
  ])
    .pipe($.if(isProduction(), $.concat("app.min.js")))
    .pipe($.size({title: "js: normal"}))
    .pipe($.size({title: "js: gziped", gzip: true}))
    .pipe(gulp.dest(jsPaths.dest));
});

// Delete unused vendor file
gulp.task("scripts-delete-vendors", (cb) => {
  del([`${jsPaths.dest}` + "/vendor.min.js"], cb);
});

/**
 * (Retina) Sprites
 */
gulp.task("sprite", () => {
  let cssSpriteFile, cssTemplate, retinaSpriteData, spriteData;

  cssSpriteFile = "_sprite.scss";
  cssTemplate = "./vendor/spritesmith-retina-mixins.template.mustache";

  gulp.src(`${imgPaths.src}/sprite/2x/*.png`)
    .pipe($.changed(`${imgPaths.src}/sprite/1x`))
    .pipe($.imageResize({
      width: "50%",
      height: "50%"
    })).pipe(gulp.dest(`${imgPaths.src}/sprite/1x`));


  retinaSpriteData = gulp.src(`${imgPaths.src}/sprite/2x/*.png`)
    .pipe(spritesmith({
      imgName: "sprite2x.png",
      imgPath: "/images/sprite2x",
      cssName: cssSpriteFile,
      cssTemplate: cssTemplate
    }));

  retinaSpriteData.img
    .pipe($.imagemin(imageOptimizationOptions))
    .pipe(gulp.dest(imgPaths.dest));

  spriteData = gulp.src(`${imgPaths.src}/sprite/1x/*.png`)
    .pipe(spritesmith({
      imgName: "sprite.png",
      imgPath: "/images/sprite",
      cssName: cssSpriteFile,
      cssTemplate: cssTemplate
    }));

  spriteData.img
    .pipe($.imagemin(imageOptimizationOptions))
    .pipe(gulp.dest(imgPaths.dest));

  return spriteData.css.pipe(gulp.dest(`${cssPaths.src}/helper`));

});

/**
 * Compressing images
 *
 * Ignoring the sprite folder since only the sprite.png and sprite@2x.png files are needed.
 * How to ignore a folder: https://github.com/gulpjs/gulp/issues/165#issuecomment-32613179
 */
gulp.task("compress-images", () => {
  return gulp.src([`${imgPaths.src}/**/*`, `!${imgPaths.src}/sprite{,/**}`])
    .pipe($.changed(imgPaths.dest))
    .pipe($.imagemin(imageOptimizationOptions))
    .pipe(gulp.dest(imgPaths.dest));
});

/**
 * Generate font files from SVG icons
 */
gulp.task("iconfont", () => {
  let fontName = "iconfont";

  return gulp.src([`${fontPaths.src}/*.svg`])
    .pipe($.iconfont({
      fontName: fontName,
      appendUnicode: true,
      normalize: true
    }))
    .on("glyphs", function (glyphs) {
      let options = {
        glyphs: glyphs.map(function (glyph) {
          return {name: glyph.name, codepoint: glyph.unicode[0].charCodeAt(0)};
        }),
        fontName: fontName,
        fontPath: "../fonts/",
        className: "if"
      };
      gulp.src("./vendor/iconfont-template.css")
        .pipe($.consolidate("lodash", options))
        .pipe($.rename("_iconfont.scss"))
        .pipe(gulp.dest(`${cssPaths.src}/helper`));
    })
    .pipe(gulp.dest(fontPaths.dest));
});

// Starting up watchers for everything
gulp.task("default", () => {
  browserSync({
    proxy: "localhost",
    logPrefix: "TWY-AP"
  });

  gulp.watch(`${cssPaths.src}/**/**/*.scss`, gulp.series("styles"));
  gulp.watch(`${jsPaths.src}/**/*.coffee`, gulp.series("scripts", "scripts-vendors", "scripts-concat", "scripts-delete-vendors", reload));
  gulp.watch(`${imgPaths.src}/sprite/2x/**/*`, gulp.series("sprite", reload));
  gulp.watch(`${imgPaths.src}/**/*`, gulp.series("compress-images", reload));
  gulp.watch(`${fontPaths.src}/**/*`, gulp.series("iconfont", reload));
});

// Build all assets
gulp.task(
  "build",
  gulp.series(
    "clean",
    gulp.parallel("sprite", "iconfont"),
    gulp.parallel("styles", "scripts", "scripts-vendors"),
    "scripts-concat",
    "scripts-delete-vendors",
    "compress-images"
  )
);

// Possible tasks:

// Performance Budget

//plugins.phantomas "http://localhost:3333", {
//    "assert-requests": "10"
//}, (err, json, results) ->
//    console.log(results.getFailedAsserts());


// Cache busting

//plugins.del(config.inject.delete, ()->
//    target = gulp.src(config.inject.target);
//sources = gulp.src(config.inject.src, {read: false});
//
//return target.pipe(plugins.inject(sources, {
//    ignorePath: "/public/",
//    transform: (filePath) ->
//        console.log filePath
//    if filePath.slice(-4) == ".css"
//    return "{{ "#{filePath.replace("/stylesheets/", "")}" | stylesheet_tag: "all" }}"
//
//    return plugins.inject.transform.apply(plugins.inject.transform, arguments)
//}))
//    .pipe(gulp.dest(config.inject.dest));
//)

//gulp.src config.cachebust.style
//    .pipe plugins.rev()
//    .pipe gulp.dest(config.styles.dest)
//
//gulp.src config.cachebust.script
//    .pipe plugins.rev()
//    .pipe gulp.dest(config.scripts.dest)

// Styleguide
//gulp.task("styleguide", () => {
//  gulp.src(["./app/styles/**/*.scss", "!./app/styles/helper/*.scss"])
//    .pipe(styleguide.generate({
//      title: "localsearch.ch Styleguide",
//      server: true,
//      port: 3002,
//      styleVariables: "./app/styles/settings/variables.scss",
//      rootPath: "styleguide",
//      overviewPath: "README.md"
//    }))
//    .pipe(gulp.dest("styleguide"));
//
//  return gulp.src("./app/styles/style.scss")
//    .pipe($.sass({
//      includePaths: config.styles.includes,
//      errLogToConsole: true
//    }))
//    .pipe(styleguide.applyStyles())
//    .pipe(gulp.dest("styleguide"));
//});

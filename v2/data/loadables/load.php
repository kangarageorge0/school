<?php

namespace mutall;
//
//Catch all errors, including warnings.
\set_error_handler(function($errno, $errstr, $errfile, $errline /*, $errcontext*/) {
    throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
});

//The schema is the base of all our applications; it is primarily used for
//supporting the database class
include_once $_SERVER['DOCUMENT_ROOT'].'/schema/v/code/schema.php';
//
//Resolve the questionnaire reference (for loading large tables)
include_once $_SERVER['DOCUMENT_ROOT'].'/schema/v/code/questionnaire.php';
//
//Read the json/csv assoc file
$sources = file('json and csv.csv');
//
//Execute a function
load_1_source(69, $sources);
//load_all($sources);
//
//A function for loading identified source
function load_1_source($source, $sources):void{
    //
    //A function for loading all the associations
    //
    //Pick the first element of the association array. Arrays are 0-base indexes.
    $pair = $sources[$source];
    //
    //Use the comma separator to split the csv/json pair text into json and csv 
    //file name
    $files = str_getcsv($pair);
    //
    //The csv is the firt element. Add the absolute path
    $csv = "/mutall_projects/school/v/data/loadables/".$files[0];
    //
    //The json is the 2nd element. Add a relative pah
    $json = "./layouts/".$files[1];
    //
    //Read the layout specified by he json file (as text)
    $text1 = file_get_contents($json);
    //
    //Replace all references to the csv (%s)  with the actual csv file name
    $text2 =sprintf($text1, $csv);
    //
    //Convert the json text to PHP object. It this is an array of layouts
    $layouts = json_decode($text2);
    //
    //Use the0 layouts to create the questionnaire object. 
    $q = new questionnaire($layouts);
    //
    //Export the data referenved by ythe questionnaire to the appropriate database
    //and log the progress to the given xml file
    $html = $q->load_common(__DIR__."\\log.xml");
    //
    //Show whether the process was successful or not
    echo $html;
}

//A function for loading all the sources
function load_all($sources):void{
    //
    for($i=0; $i<count($sources);  $i++){
        echo "</br></br>Source=$i</br>";
        load_1_source($i, $sources);
    }
}
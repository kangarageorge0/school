<?php
//
//This has to be teh first statement in a file
namespace tracker;
//
//Resolve the library config file
include_once "../../../schema/v/code/config.php";
//
//The local config file extends the config in the libary
class config extends \mutall\config{
    //
    //Title appearing on navigation tab should be the same as the namespace 
    //of this application.
    public string $id =__NAMESPACE__;
    // 
    //The name of the application's database.
    public string $app_db = "school_3"; 
    //
    //Subject comprises of the entity name to show in the home page
    //plus the database it comes from.
    public string $subject_ename="student";
    public array $subject;
     //
    //The full trademark name of the application
    public string $trade = "Tracking mutall_data Activities";
    //
    //For advertising purposes
    public string $tagline= "Ensuring Effectiveness in What We Do";
    //
    //Name of the application developer
    public string $developer = "Kang'ara";
    //
    //
    function __construct(){
        //
        //Use the current application path, i.e., code, to initialize the parent
        parent::__construct(__DIR__);
        //
        //Subject comprises of the entity name to show in the home page
        //plus the database it comes from.
        $this->subject= [$this->subject_ename, $this->app_db];
    }
}

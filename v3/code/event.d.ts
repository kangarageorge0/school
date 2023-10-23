class plan{
    public name:string;
    public initiate():true|Error;
    public cancel():true|Error;
    public delete():true|Error;
    constructor(name:string);
}
class event extends plan{
    public start_date:string;
    public end_date:string;
    constructor(name:string,start_date:string,end_date:string);
}
class activity extends plan{
    public command:string;
    constructor(name:string,command:string);
}
class once extends activity{
    public date:string;
    constructor(name:string,command:string,date:string);
}
class repetitive extends activity{
    public start_date:string;
    public end_date:string;
    public frequency:string;
    constructor(name:string,command:string,start_date:string,end_date:string,
    frequency:string);
}

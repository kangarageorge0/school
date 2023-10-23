<?php
//In future I might need to execute this file with some external parameter. A 
//HTML file is not have this capability. PHP does, hence its adoption as an
//executable. Files with html extensions are now considered to be fragments, to
//incorporated into executables as need.
?>
<!DOCTYPE html>
<html>
    <head>
        <title>Test</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script type="module">
            //
            //Importing the sheetjs library using CDN. Importing from here does not
            //requires us to use the relative referencing required when we do it
            //within a module
            import * as xl from "https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs";
            //
            window.onload = async()=>{
                //
                //Make xl a global variable, so we can use it for running our code. 
                //It wont satisfy typescript
                window.xl = xl;
                //
                //Import the default class, in this case sheetjs
                import  Page from "./sheetjs.js";
                //
                //Create a new page 
                const page = new Page();
                //
                //Exposing the page variabe to be accessibe in HTML
                window.page = page;
                //
                //Test the sheetjs executable
                alert(await page.test('/school/sheetjs/example.xlsx', 'GD4 END TERM', 'grade4_end_term'));
            };
        </script>
    
    </head>
    <body id="anchor">
        <!-- The html fragment, sheetjs.html, will be inserted here at runtime-->
    </body>
</html>

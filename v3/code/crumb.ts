type factor_type = 'f1'|'f2'|'f3'

const factors:Array<factor_type> = ['f1', 'f2', 'f3'];

const levels:Partial<{[k in factor_type]:Array<string>}> = {
    f1:['l11','l12', 'l13'],
    f2:['l21','l22'],
    f3:['l31','l32']
}

//Compute the cells to which we wish to map each factor. Note the unique signature
//of each cell.
/*
[
    f1 =>[
        {f1:'l11'}, 
        {f1:'l12'}, 
        {f1:'l13'}
    ]    
    f2 =>[
        {f2:'l11', f1:'l11'}, 
        {f2:'l11', f1:'l12'}, 
        {f2:'l11', f1:'l13'},

        {f2:'l12', f1:'l11'}, 
        {f2:'l12', f1:'l12'}, 
        {f2:'l12', f1:'l13'}
    ]
    f3=>[
        {f3:'l31', f2:'l11', f1:'l11'}, 
        {f3:'l31', f2:'l11', f1:'l12'}, 
        {f3:'l31', f2:'l11', f1:'l13'},
        {f3:'l31', f2:'l12', f1:'l11'}, 
        {f3:'l31', f2:'l12', f1:'l12'}, 
        {f3:'l31', f2:'l12', f1:'l13'},

        {f3:'l32', f2:'l11', f1:'l11'}, 
        {f3:'l32', f2:'l11', f1:'l12'}, 
        {f3:'l32', f2:'l11', f1:'l13'},
        {f3:'l32', f2:'l12', f1:'l11'}, 
        {f3:'l32', f2:'l12', f1:'l12'}, 
        {f3:'l32', f2:'l12', f1:'l13'}
    ]
]    
*/     
export const all_cells:Array<Array<Partial<{[f in factor_type]:string}>>> 
    = factors.map((crumblet:factor_type, index:number)=>{
    //
    //Slice from factors, starting from 0 to i+1, to get anscestors. The ancestor
    //of f1 (inclusing self) is [f1], of f2 are [f2,f1] and of f3 are [f3,f2,f1]
    const ancestors:Array<factor_type> = factors.slice(0, index+1);
    //
    //Define the fucntion for genarating cells for a given factor
    function generate_cells( 
        previous_cells:Array<Partial<{[f in factor_type]:string}>>, 
        current_factor:factor_type
    ):Array<Partial<{[f in factor_type]:string}>>{
        //
        //Start with an empty list of cells
        const cells:Array<Partial<{[f in factor_type]:string}>> = [];
        //
        //For the first time roun (when there are no previous cells)......
        if (previous_cells.length==0){
            //
            //For each level of the currrent factor
            levels[current_factor]!.forEach((level)=>{
                //
                //Construct a new cell
                const new_cell: Partial<{[f in factor_type]:string}> = {};
                //
                //Add the new factor level
                new_cell[current_factor] = level;
                //
                //All the new cell to the list
                cells.push(new_cell);
            });
        } else{
            //For subsquent cases.....
            //
            //For each previous cell...
            previous_cells.forEach((cell:Partial<{[f in factor_type]:string}>)=>{
                //
                //For each level of the currrent factor
                levels[current_factor]!.forEach((level)=>{
                    //
                    //Construct a new cell from the the ancestor one
                    const new_cell: Partial<{[f in factor_type]:string}> = {...cell}
                    //
                    //Add teh new factor level
                    new_cell[current_factor] = level;
                    //
                    //All the new cell to the list
                    cells.push(new_cell);
                })           
            });
        }    
        //
        //Return the cells
        return cells;
    }
    //
    //Reduce each ancestor of this factor to an array of its corresponding cells 
    //as illustrated above. Start with an empty list of cells. Note: there are
    //2 versions of reduce. The initial value must be provided to help typescript
    //pick teh versuion we want
    const cells:Array<Partial<{[f in factor_type]:string}>> = ancestors.reduce(generate_cells, []);
    //
    //Return teh reduction
    return cells;
})

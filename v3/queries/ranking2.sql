with 
    #
    #PRESENT THE RAW VALUES NEEDED FOR CALCULATING THE TOTAL
    #
    #Getting the percentages on each subject
    percent as (
        select
            score.value as score,
            round(score.value/performance.out_of*100) as percent,
            
            school.id as school,
            year.value as year,
            class.name as class,
            exam.name as exam,
            sitting.date as date,
            stream.id as stream,
            student.name as student,
            subject.id as subject
            
       from score 
            inner join candidate on score.candidate=candidate.candidate
            inner join progress on candidate.progress =progress .progress
            inner join student on progress.student = student.student
            inner join year on progress.year = year.year
            inner join stream on year.stream = stream.stream
            inner join class on stream.class = class.class
            inner join school on class.school = school.school
            inner join performance on score.performance=performance.performance
            inner join subject on performance.subject=subject.subject
            inner join sitting on performance.sitting=sitting.sitting
            inner join exam on sitting.exam=exam.exam
     ),
    # 
    #
    #This is the query that drives our system
    #Grading all the percent scores
    grading as(
        select percent.*,
            #
            #Add grading using the Expectation system
            case 
                when percent >=90 and percent <= 100 then 'E.E'
                when percent >=50 and percent < 90 then 'M.E'
                when percent >=30 and percent < 50 then 'A.E'
                else 'B.E'
            end as expectation,
            #
            #Add grading using the Abc system
            case 
                when percent >=80 and percent <= 100 then 'A'
                when percent >=75 and percent < 80 then 'A-'
                when percent >=71 and percent < 75 then 'B+'
                when percent >=65 and percent < 71 then 'B'
                when percent >=61 and percent < 65 then 'B-'
                when percent >=55 and percent < 61 then 'C+'
                when percent >=51 and percent < 55 then 'C'
                when percent >=45 and percent < 51 then 'C-'
                when percent >=41 and percent < 45 then 'D+'
                when percent >=35 and percent < 41 then 'D'
                when percent >=31 and percent < 35 then 'D-'
                else 'E'
            end as abc                      
        from percent
    ),
    #
    #Collect the raw values as a json object
    raw_values as (
        select
            #
            #Select all the fields from percent table
            grading.*,
            #
            #Compile the object using 4 keys, viz., subject, score, percent and
            #
            #grading(using the expectation format)
            json_object('subject',subject, 'value',value, 'percent',percent,'grade',expectation) as raw_value
        from grading
    ),
    #
    #Get the total summary of all the scores for each student in each sitting
    #
    #including the raw values
    total as (
         select 
            school,
            year,
            class,
            exam,
            stream,
            date,
            student,
            #
            #Collect all the raw values into an array
            json_arrayagg(raw_value) as raw_values,
            #
            #Sum of all the percentages for a given sitting
            sum(percent) as total
        from raw_values
        group by school,year,class,exam,stream, date,student
    ),
    #
    #Ranking the students within a sitting
    rank_students as (
        select total.*,
            rank() OVER w as ranking,

            #
            #NOT GIVING OUT THE CORRECT EXPECTED VALUES WHEN THERE IS ORDERING
            count(*) over (partition BY year,class,exam, date) as count
        from total
        window w as (partition BY school,year,class,exam,date order by total desc)
    ),

    out_of as (
        select rank_students.*,
            concat(ranking,  '/' , count) as out_of
        from rank_students
    ),
    
    ######################################-
    #
    #CALCULATING THE MEAN SCORE FOR EACH SUBJECT
    #
    #Getting the mean standard score for each subject
    mean as (
         select
            school,
            year,
            class,
            exam,
            stream,
            date,
            subject,
            sum(percent)/count(percent) as mean,
            count(*)
        from percent
        group by school,year,class,exam,stream, date,subject
         
    ),
    #
    #Rank the subjects within a sitting
    rank_subjects as(
        select mean.*,mean,
            rank() OVER w as ranks
        from mean
        window w as (partition BY school,year,class,exam,stream, date order by mean desc)
    ),
    #
    #This query moulds the desired output interms of factors that are
    # associated with the 3 key regions of a worksheet, viz., crown, crest and 
    # crumb
    
    measurements as (
        select  school,year,class,exam,stream,date,subject, 'score' as measurement, score as value from  grading
        union all
        select  school,year,class,exam,stream,date,subject, 'percent' as measurement, percent as value from  grading
        union all
        select  school,year,class,exam,stream,date,subject, 'expectation' as measurement, expectation as value from  grading
        union all
        select  school,year,class,exam,stream,date,subject, 'abc' as measurement, abc as value from  grading
    ),
    #
    #Filter the data based on the crown factors
    crown as (
        select measurements.* from measurements where school='kaps' and year=2019    
    ),
    #
    #Identify the crumb factors
    crumb as (
        select
            crown.*,
            json_object(
            'id', concat_ws('/', class, exam, date,subject,measurement),
            'value',value) as value2
            
        from crown    
    ),
    #
    #Use crest factors for grouping the crows
    crest as (
        select stream, student, json_arrayagg(value2) as raw_values from crumb group by stream, student
    )

select * from measurements;
    
with 
    #
    #PRESENT THE RAW VALUES NEEDED FOR CALCULATING THE TOTAL
    #
    #Getting the percentages on each subject
    percent as (
        select
            school.id as school,
            year.value as year,
            class.name as class,
            exam.name as exam,
            sitting.date as date,
            stream.id as stream,
            REVERSE(student.name ) AS student,
            subject.id as subject,
            '|' as __separator,
            score.value as value,
            round(score.value/performance.out_of*100) as percent
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
                when percent >=80 and percent <= 100 then json_object('value',percent,'grade','E.E','color','green')
                when percent >=65 and percent < 80 then json_object('value',percent,'grade','M.E','color','cyan')
                when percent >=50 and percent < 65 then json_object('value',percent,'grade','A.E','color','yellow')
                else json_object('value',percent,'grade','B.E','color','red')
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
    ) , 

        measurements as (
        select 
                `school`, `year`, `class`, `exam`, `date`, `student`, `stream`, `subject`, 
                'expectation' as measurement,
                expectation as value 
            from grading
      
           
 union all select 
                `school`, `year`, `class`, `exam`, `date`, `student`, `stream`, `subject`, 
                'percent' as measurement,
                percent as value 
            from grading
 union  all select 
                `school`, `year`, `class`, `exam`, `date`, `student`, `stream`, `subject`, 
                'value' as measurement,
                value as value 
            from grading  ),

            crown as (
                select 
                    measurements.* 
                from measurements 
                 where measurement='expectation' and school='kaps' and year='2019' and class='7' and exam='DOUBLEMERIT EXAM' and date='2019-01-30'
	)
,

                crumb as (
                select
                    crown.*,
                    json_object(
                        'id', concat_ws('_', subject),
                        'value',value
                    ) as value2
                 from crown    
            ),

            crest as (
                select 
                    student, stream, 
                    json_arrayagg(value2) as raw_values  
                    , round(sum(value->>'$.value'),0) as sum, round(count(value->>'$.value'),0) as count, round(avg(value->>'$.value'),0) as avg
                from 
                    crumb 
                    group by student, stream
            ),

                bottom as (
                 select
                    json_object(
                        'sum',round(sum(value->>'$.value'),0), 'count',round(count(value->>'$.value'),0), 'avg',round(avg(value->>'$.value'),0)
                    ) as summaries,
                    concat_ws('_', subject) as id  
                 from crown
                group by concat_ws('_', subject)    
            )select * from crest;

select payment.* from payment where amount = '1,500';
SELECT CONCAT(DATE_FORMAT(payment.date, '%b'), '_', YEAR(payment.date), '_', MONTH(payment.date)) AS date
FROM payment;

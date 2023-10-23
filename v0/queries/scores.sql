with org as (
    select 
        stage.`year` as stage,
        stream.name as stream,
        student.name as student,
        json_objectagg(subject.`name`, score.`value`) as score
    from 
        score
        inner join progress on score.progress = progress.progress
        inner join student on  progress.student = student.student
        inner join subject on score.subject = subject.subject
        inner join stage on progress.stage = stage.stage
        inner join stream on stage.stream = stream.stream
    group by
        stage, stream, student
)
select stage, stream, student, 
    score->>"$.maths" as maths,
    score->>"$.english" as english,
    score->>"$.hygene" as hygene,
    score->>"$.environmental" as environment,
    score->>"$.cre" as cre,
    score->>"$.kiswahili" as kiswahili
from org;


with org as (
    select 
        exam.name as exam,
        stage.`year` as stage,
        stream.name as stream,
        student.name as student,
        sitting.date as sitting,
        json_objectagg(subject.`id`, score.`value`) as score
    from 
        score
        inner join progress on score.progress = progress.progress
        inner join student on  progress.student = student.student
        inner join performance on score.performance = performance.performance
        inner join subject on performance.subject = subject.subject
        inner join sitting on performance.sitting =sitting.sitting
        inner join exam on sitting.exam = exam.exam
        inner join stage on progress.stage = stage.stage
        inner join stream on stage.stream = stream.stream
    group by
       exam,sitting, stage, stream, student
)
select stage, stream, student, 
    score->>"$.maths" as maths,
    score->>"$.english" as english,
    score->>"$.hygene" as hygene,
    score->>"$.environmental" as environment,
    score->>"$.cre" as cre,
    score->>"$.kiswahili" as kiswahili
from org;

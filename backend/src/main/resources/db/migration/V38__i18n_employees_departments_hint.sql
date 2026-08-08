-- Departments checkbox list on the employee form had no indication that
-- more than one could be selected -- add a small hint under the label.
insert into translation (key, value_ar, value_en, value_hi) values
    ('employees.departmentsHint', '(يمكن اختيار أكثر من قسم)', '(you can select more than one department)', '(आप एक से अधिक विभाग चुन सकते हैं)');

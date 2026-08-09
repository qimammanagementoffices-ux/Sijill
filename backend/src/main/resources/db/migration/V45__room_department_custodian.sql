alter table room add column department_id uuid references department(id);
alter table room add column custodian_employee_id uuid references employee(id);

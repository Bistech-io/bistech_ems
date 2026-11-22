export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type EmploymentStatus = 'active' | 'inactive' | 'suspended';

export interface DepartmentOption {
  id: string;
  name: string;
  description?: string | null;
  activeEmployeeCount?: number;
}

export interface DesignationOption {
  id: string;
  title: string;
  activeEmployeeCount?: number;
}

export interface EmployeeItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  workEmail: string;
  phone: string | null;
  department: {
    id: string;
    name: string;
  };
  designation: {
    id: string;
    title: string;
  };
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  joiningDate: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    accountStatus: string;
    roles: string[];
  };
}

export interface PersonalProfileInput {
  dateOfBirth?: string;
  personalEmail?: string;
  personalPhone?: string;
  addressLine?: string;
  city?: string;
  countryCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

export interface CreateEmployeePayload {
  firstName: string;
  lastName: string;
  username?: string;
  workEmail: string;
  phone?: string;
  departmentId: string;
  designationId: string;
  employmentType: EmploymentType;
  joiningDate: string;
  password?: string;
  personalProfile?: PersonalProfileInput;
}

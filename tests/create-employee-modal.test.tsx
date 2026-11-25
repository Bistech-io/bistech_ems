import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreateEmployeeModal } from '@/features/employees/components/create-employee-modal';
import * as api from '@/features/employees/api';
import { ApiError } from '@/lib/api/errors';
import type { DepartmentOption, DesignationOption, EmployeeItem } from '@/features/employees/types';

describe('CreateEmployeeModal', () => {
  const departments: DepartmentOption[] = [
    { id: 'dept-eng', name: 'Engineering' },
    { id: 'dept-hr', name: 'Human Resources' },
  ];

  const designations: DesignationOption[] = [
    { id: 'desig-hr-mgr', title: 'HR Manager' },
    { id: 'desig-swe', title: 'Software Engineer' },
  ];

  it('renders department dropdown and designation datalist autocomplete', () => {
    render(
      <CreateEmployeeModal
        open={true}
        departments={departments}
        designations={designations}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    expect(screen.getByText('New Employee')).toBeDefined();
    expect(screen.getByLabelText(/Department \*/i)).toBeDefined();
    expect(screen.getByLabelText(/Designation \*/i)).toBeDefined();

    const datalist = document.getElementById('designations-datalist');
    expect(datalist).not.toBeNull();
    const options = datalist?.querySelectorAll('option');
    expect(options?.length).toBe(2);
    expect(options?.[0].getAttribute('value')).toBe('HR Manager');
    expect(options?.[1].getAttribute('value')).toBe('Software Engineer');
  });

  it('reuses existing designation ID when typed title matches an existing one', async () => {
    const handleCreated = vi.fn();
    const createDesigSpy = vi.spyOn(api, 'createDesignation');
    const createEmpSpy = vi.spyOn(api, 'createEmployee').mockResolvedValue({
      id: 'emp-101',
      employeeCode: 'BST-1009',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      workEmail: 'john@bistech.io',
      phone: null,
      department: { id: 'dept-eng', name: 'Engineering' },
      designation: { id: 'desig-swe', title: 'Software Engineer' },
      employmentType: 'full_time',
      employmentStatus: 'active',
      joiningDate: '2026-11-23',
      user: {
        id: 'u-101',
        username: 'john.doe',
        displayName: 'John Doe',
        email: 'john@bistech.io',
        accountStatus: 'active',
        roles: ['employee'],
      },
    });

    render(
      <CreateEmployeeModal
        open={true}
        departments={departments}
        designations={designations}
        onClose={vi.fn()}
        onCreated={handleCreated}
      />,
    );

    fireEvent.change(screen.getByLabelText(/First Name \*/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name \*/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/Work Email \*/i), {
      target: { value: 'john@bistech.io' },
    });
    fireEvent.change(screen.getByLabelText(/Department \*/i), {
      target: { value: 'dept-eng' },
    });
    fireEvent.change(screen.getByLabelText(/Designation \*/i), {
      target: { value: 'Software Engineer' },
    });

    const form = screen.getByRole('button', { name: /Create Employee/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(createEmpSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          designationId: 'desig-swe',
        }),
        expect.any(String),
      );
    });

    expect(createDesigSpy).not.toHaveBeenCalled();
    expect(handleCreated).toHaveBeenCalledTimes(1);

    createDesigSpy.mockRestore();
    createEmpSpy.mockRestore();
  });

  it('creates new designation and surfaces server error if creation fails', async () => {
    const createDesigSpy = vi
      .spyOn(api, 'createDesignation')
      .mockRejectedValue(
        new ApiError('BAD_REQUEST', 400, [], 'req-1', 'Cannot create designation with special characters'),
      );
    const createEmpSpy = vi.spyOn(api, 'createEmployee');

    render(
      <CreateEmployeeModal
        open={true}
        departments={departments}
        designations={designations}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/First Name \*/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last Name \*/i), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText(/Work Email \*/i), {
      target: { value: 'jane@bistech.io' },
    });
    fireEvent.change(screen.getByLabelText(/Department \*/i), {
      target: { value: 'dept-eng' },
    });
    fireEvent.change(screen.getByLabelText(/Designation \*/i), {
      target: { value: 'Specialist $$$' },
    });

    const form = screen.getByRole('button', { name: /Create Employee/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText('Cannot create designation with special characters'),
      ).toBeDefined();
    });

    expect(createEmpSpy).not.toHaveBeenCalled();

    createDesigSpy.mockRestore();
    createEmpSpy.mockRestore();
  });

  it('displays conflict message when email or username is already taken', async () => {
    const createEmpSpy = vi.spyOn(api, 'createEmployee').mockRejectedValue(
      new ApiError(
        'CONFLICT',
        409,
        [],
        'req-conflict',
        'An account with this email address already exists in this workspace',
      ),
    );

    render(
      <CreateEmployeeModal
        open={true}
        departments={departments}
        designations={designations}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/First Name \*/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Last Name \*/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/Work Email \*/i), {
      target: { value: 'testemp1@bistech.com' },
    });
    fireEvent.change(screen.getByLabelText(/Department \*/i), {
      target: { value: 'dept-eng' },
    });
    fireEvent.change(screen.getByLabelText(/Designation \*/i), {
      target: { value: 'Software Engineer' },
    });

    const form = screen.getByRole('button', { name: /Create Employee/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText('An account with this email address already exists in this workspace'),
      ).toBeDefined();
    });

    createEmpSpy.mockRestore();
  });

  it('parses employee item successfully and derives fullName when omitted', () => {
    const raw = {
      id: 'emp-1',
      employeeCode: 'BST-1010',
      firstName: 'Test Employee 03',
      lastName: '.',
      workEmail: 'testemp3@bistech.com',
      phone: null,
      department: { id: 'dept-1', name: 'Human Resources' },
      designation: { id: 'desig-1', title: 'Junior HR' },
      employmentType: 'full_time',
      employmentStatus: 'active',
      joiningDate: '2026-11-23T00:00:00.000Z',
      user: {
        id: 'u-1',
        username: 'test-emp-3',
        displayName: 'Test Employee 03 .',
        email: 'testemp3@bistech.com',
        accountStatus: 'active',
        roles: ['employee'],
      },
    };

    const parsed = api.employeeItemSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.fullName).toBe('Test Employee 03 .');
    }
  });
});


import React, { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, Button, Input } from '@/components/UI';
import { adminApi, UserInfo } from '@/api/admin';
import { format } from 'date-fns';

const UserManagementPage: React.FC = () => {
  const [data, setData] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const columnHelper = createColumnHelper<UserInfo>();

  const columns = useMemo<ColumnDef<UserInfo, any>[]>(
    () => [
      columnHelper.accessor('nickname', {
        header: 'User',
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-medium">{info.getValue()}</span>
            <span className="text-xs text-gray-500">{info.row.original.email}</span>
          </div>
        ),
      }),
      columnHelper.accessor('birth_year', {
        header: 'Age',
        cell: (info) => {
          const birthYear = info.getValue();
          const age = birthYear ? new Date().getFullYear() - birthYear : 'N/A';
          return <span>{age}</span>;
        },
      }),
      columnHelper.accessor('gender', {
        header: 'Gender',
        cell: (info) => {
          const gender = info.getValue();
          return (
            <span className="capitalize">
              {gender === 'male' ? '👨 Male' : gender === 'female' ? '👩 Female' : '❓ Other'}
            </span>
          );
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();
          const colorMap = {
            active: 'bg-green-100 text-green-800',
            suspended: 'bg-yellow-100 text-yellow-800',
            banned: 'bg-red-100 text-red-800',
          };
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorMap[status as keyof typeof colorMap]}`}>
              {status}
            </span>
          );
        },
      }),
      columnHelper.accessor('activity_stats', {
        header: 'Activity',
        cell: (info) => {
          const stats = info.getValue();
          return (
            <div className="text-xs space-y-1">
              <div>📝 {stats.total_posts} posts</div>
              <div>💬 {stats.total_sessions} sessions</div>
              <div>❤️ {stats.empathy_given} empathy</div>
            </div>
          );
        },
      }),
      columnHelper.accessor('created_at', {
        header: 'Joined',
        cell: (info) => (
          <span className="text-sm">
            {format(new Date(info.getValue()), 'MMM dd, yyyy')}
          </span>
        ),
      }),
      columnHelper.accessor('last_login', {
        header: 'Last Login',
        cell: (info) => {
          const lastLogin = info.getValue();
          return (
            <span className="text-sm">
              {lastLogin ? format(new Date(lastLogin), 'MMM dd, yyyy') : 'Never'}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex space-x-2">
            <UserActionButtons user={info.row.original} onAction={handleUserAction} />
          </div>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const users = await adminApi.getUsers({
        limit: 1000, // Load all for client-side filtering
      });
      setData(users);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (action: 'suspend' | 'ban', user: UserInfo) => {
    const reason = prompt(`Enter reason for ${action}ing user ${user.nickname}:`);
    if (!reason) return;

    try {
      if (action === 'suspend') {
        await adminApi.suspendUser(user.user_id, { reason });
      } else if (action === 'ban') {
        await adminApi.banUser(user.user_id, { reason });
      }
      
      alert(`User ${action}ed successfully`);
      loadUsers(); // Reload data
    } catch (err) {
      console.error(`Error ${action}ing user:`, err);
      alert(`Failed to ${action} user`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading users...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-red-500 mb-2">⚠️</div>
            <p className="text-red-600">{error}</p>
            <Button onClick={loadUsers} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <Button onClick={loadUsers} variant="ghost">
          🔄 Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.length}</div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.filter(u => u.status === 'active').length}
              </div>
              <div className="text-sm text-gray-500">Active Users</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {data.filter(u => u.status === 'suspended').length}
              </div>
              <div className="text-sm text-gray-500">Suspended</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {data.filter(u => u.status === 'banned').length}
              </div>
              <div className="text-sm text-gray-500">Banned</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search users..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
            <select
              value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
              onChange={(e) =>
                table.getColumn('status')?.setFilterValue(e.target.value || undefined)
              }
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b bg-gray-50">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center space-x-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: ' 🔼',
                            desc: ' 🔽',
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <span>
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1"
                >
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      Show {pageSize}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const UserActionButtons: React.FC<{
  user: UserInfo;
  onAction: (action: 'suspend' | 'ban', user: UserInfo) => void;
}> = ({ user, onAction }) => {
  if (user.status === 'banned') {
    return <span className="text-xs text-gray-500">Banned</span>;
  }

  return (
    <div className="flex space-x-1">
      {user.status === 'active' && (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAction('suspend', user)}
            className="text-yellow-600 hover:text-yellow-700"
          >
            Suspend
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAction('ban', user)}
            className="text-red-600 hover:text-red-700"
          >
            Ban
          </Button>
        </>
      )}
      {user.status === 'suspended' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onAction('ban', user)}
          className="text-red-600 hover:text-red-700"
        >
          Ban
        </Button>
      )}
    </div>
  );
};

export default UserManagementPage;
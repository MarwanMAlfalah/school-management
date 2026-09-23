import FormContainer from "@/components/FormContainer";
// import FormModel from "@/components/FormModel";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Class, Prisma, Student } from "@/generated/prisma/client";
// import { role, studentsData } from "@/lib/data";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAuthContext } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

type StudentList = Student & { class: Class };

const StudentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { role } = await getAuthContext();

  const columns = [
    {
      header: "Info",
      accessor: "info",
    },
    {
      header: "Student ID",
      accessor: "studentId",
      className: "hidden md:table-cell",
    },
    {
      header: "Grade",
      accessor: "grade",
      className: "hidden md:table-cell",
    },
    {
      header: "Phone",
      accessor: "phone",
      className: "hidden md:table-cell",
    },
    {
      header: "Address",
      accessor: "address",
      className: "hidden md:table-cell",
    },
    ...(role === "admin"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const renderRow = (item: StudentList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 text-sm even:bg-slate-50 hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={item.img || "/noAvatar.png"}
          alt={item.name}
          width={40}
          height={40}
          className="h-10 w-10 rounded-full object-cover md:hidden xl:block"
        />

        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-gray-500">{item.class.name}</p>
        </div>
      </td>

      <td className="hidden px-4 md:table-cell">{item.username}</td>

      <td className="hidden px-4 md:table-cell">{item.class.name[0]}</td>

      <td className="hidden px-4 md:table-cell">{item.phone}</td>

      <td className="hidden px-4 md:table-cell">{item.address}</td>

      <td className="px-4">
        <div className="flex items-center gap-2">
          <Link href={`/list/students/${item.id}`}>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-lamaSky"
              aria-label={`View ${item.name}`}
            >
              <Image src="/edit.png" alt="" width={16} height={16} />
            </button>
          </Link>

          {role === "admin" && (
            // <button
            //   type="button"
            //   className="flex h-7 w-7 items-center justify-center rounded-full bg-lamaPurple"
            //   aria-label={`Delete ${item.name}`}
            // >
            //   <Image
            //     src="/delete.png"
            //     alt=""
            //     width={16}
            //     height={16}
            //   />
            // </button>
            <FormContainer table="student" type="delete" id={item.id} />
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION

  const query: Prisma.StudentWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "teacherId":
            query.class = {
              lessons: {
                some: {
                  teacherId: value,
                },
              },
            };
            break;
          case "search":
            query.OR = [
              {
                name: {
                  contains: value,
                  mode: "insensitive",
                },
              },
              {
                surname: {
                  contains: value,
                  mode: "insensitive",
                },
              },
              {
                username: {
                  contains: value,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: value,
                  mode: "insensitive",
                },
              },
              {
                phone: {
                  contains: value,
                  mode: "insensitive",
                },
              },
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      include: {
        class: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.student.count({ where: query }),
  ]);

  return (
    <div className="m-4 mt-0 flex-1 rounded-md bg-white p-4">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden text-lg font-semibold md:block">All Students</h1>

        <div className="flex w-full flex-col items-center gap-4 md:w-auto md:flex-row">
          <TableSearch />

          <div className="flex items-center gap-4 self-end">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-lamaYellow"
            >
              <Image src="/filter.png" alt="Filter" width={14} height={14} />
            </button>

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-lamaYellow"
            >
              <Image src="/sort.png" alt="Sort" width={14} height={14} />
            </button>

            {role === "admin" && (
              // <button
              //   type="button"
              //   className="flex h-8 w-8 items-center justify-center rounded-full bg-lamaYellow"
              // >
              //   <Image
              //     src="/plus.png"
              //     alt="Add student"
              //     width={14}
              //     height={14}
              //   />
              // </button>
              <FormContainer table="student" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />

      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default StudentListPage;

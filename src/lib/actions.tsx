"use server";

import {
  SubjectSchema,
  ClassSchema,
  TeacherSchema,
  StudentSchema,
  ExamSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { UserSex } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";

type CurrentState = { success: boolean; error: boolean; message?: string };

const isClerkUserId = (id: string) => id.startsWith("user_");

const normalizeOptionalString = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const uniqueFieldMessageMap: Record<string, string> = {
  email: "Email is already in use.",
  username: "Username is already in use.",
  phone: "Phone number is already in use.",
  name: "Name is already in use.",
  title: "Title is already in use.",
};

const getPrismaErrorMessage = (
  err: unknown,
  uniqueMessages: Record<string, string> = uniqueFieldMessageMap,
) => {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    const target = err.meta?.target;
    const fields = Array.isArray(target) ? target : [target];
    const field = fields.find(
      (targetField): targetField is string =>
        typeof targetField === "string" && targetField in uniqueMessages,
    );

    return field ? uniqueMessages[field] : "A unique value is already in use.";
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2003"
  ) {
    return "Invalid related record.";
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2014"
  ) {
    return "This record is still used by related records.";
  }
};

const getClerkErrorCodes = (err: unknown) => {
  if (!err || typeof err !== "object") {
    return [];
  }

  const maybeErrors = (err as { errors?: unknown }).errors;

  if (!Array.isArray(maybeErrors)) {
    return [];
  }

  return maybeErrors
    .map((error) =>
      error && typeof error === "object"
        ? (error as { code?: unknown }).code
        : undefined,
    )
    .filter((code): code is string => typeof code === "string");
};

const getClerkErrorMessage = (err: unknown) => {
  const codes = getClerkErrorCodes(err);

  if (codes.includes("form_password_pwned")) {
    return "This password has appeared in a known data breach. Please choose a stronger password.";
  }

  if (
    codes.includes("form_identifier_exists") ||
    codes.includes("form_username_exists")
  ) {
    return "Username is already in use.";
  }

  if (codes.some((code) => code.includes("password"))) {
    return "Please choose a stronger password.";
  }

  if (
    codes.some(
      (code) => code.includes("username") || code.includes("identifier"),
    )
  ) {
    return "Please check the username and try again.";
  }
};

const getActionErrorMessage = (
  err: unknown,
  uniqueMessages?: Record<string, string>,
) => getPrismaErrorMessage(err, uniqueMessages) ?? getClerkErrorMessage(err);

const getUniqueTeacherMessage = async (data: TeacherSchema) => {
  const email = normalizeOptionalString(data.email);
  const phone = normalizeOptionalString(data.phone);

  const existingTeacher = await prisma.teacher.findFirst({
    where: {
      ...(data.id ? { NOT: { id: data.id } } : {}),
      OR: [
        { username: data.username },
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
    select: { username: true, email: true, phone: true },
  });

  if (!existingTeacher) {
    return;
  }

  if (existingTeacher.username === data.username) {
    return uniqueFieldMessageMap.username;
  }

  if (email && existingTeacher.email === email) {
    return uniqueFieldMessageMap.email;
  }

  if (phone && existingTeacher.phone === phone) {
    return uniqueFieldMessageMap.phone;
  }
};

const getUniqueStudentMessage = async (data: StudentSchema) => {
  const email = normalizeOptionalString(data.email);
  const phone = normalizeOptionalString(data.phone);

  const existingStudent = await prisma.student.findFirst({
    where: {
      ...(data.id ? { NOT: { id: data.id } } : {}),
      OR: [
        { username: data.username },
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
    select: { username: true, email: true, phone: true },
  });

  if (!existingStudent) {
    return;
  }

  if (existingStudent.username === data.username) {
    return uniqueFieldMessageMap.username;
  }

  if (email && existingStudent.email === email) {
    return uniqueFieldMessageMap.email;
  }

  if (phone && existingStudent.phone === phone) {
    return uniqueFieldMessageMap.phone;
  }
};

const validateStudentRelations = async (
  data: StudentSchema,
  currentClassId?: number,
) => {
  const parent = await prisma.parent.findUnique({
    where: { id: data.parentId },
    select: { id: true },
  });

  if (!parent) {
    return "Parent not found.";
  }

  const classItem = await prisma.class.findUnique({
    where: { id: data.classId },
    include: { _count: { select: { students: true } } },
  });

  if (!classItem) {
    return "Class not found.";
  }

  if (
    classItem._count.students >= classItem.capacity &&
    currentClassId !== classItem.id
  ) {
    return "Class is full.";
  }

  const grade = await prisma.grade.findUnique({
    where: { id: data.gradeId },
    select: { id: true },
  });

  if (!grade) {
    return "Grade not found.";
  }
};

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema,
) => {
  try {
    await prisma.subject.create({
      data: {
        name: data.name,
        teachers: {
          connect: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: getActionErrorMessage(err, {
        name: "Subject name is already in use.",
      }),
    };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema,
) => {
  try {
    await prisma.subject.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        teachers: {
          set: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: getActionErrorMessage(err, {
        name: "Subject name is already in use.",
      }),
    };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = data.get("id") as string;
  try {
    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            lessons: true,
          },
        },
      },
    });

    if (!subject) {
      return { success: false, error: true, message: "Subject not found." };
    }

    if (subject._count.lessons > 0) {
      return {
        success: false,
        error: true,
        message: "Subject is still used by lessons.",
      };
    }

    await prisma.subject.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: getActionErrorMessage(err),
    };
  }
};

const normalizeClassSupervisorId = (supervisorId?: string | null) => {
  const normalized = supervisorId?.trim();
  return normalized ? normalized : null;
};

const getClassData = async (data: ClassSchema) => {
  const supervisorId = normalizeClassSupervisorId(data.supervisorId);

  const grade = await prisma.grade.findUnique({
    where: { id: data.gradeId },
    select: { id: true },
  });

  if (!grade) {
    return { message: "Grade not found." };
  }

  if (supervisorId) {
    const supervisor = await prisma.teacher.findUnique({
      where: { id: supervisorId },
      select: { id: true },
    });

    if (!supervisor) {
      return { message: "Invalid supervisor." };
    }
  }

  return {
    data: {
      name: data.name,
      capacity: data.capacity,
      gradeId: data.gradeId,
      supervisorId,
    },
  };
};

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema,
) => {
  try {
    const classData = await getClassData(data);

    if ("message" in classData) {
      return { success: false, error: true, message: classData.message };
    }

    await prisma.class.create({
      data: classData.data,
    });

    // revalidatePath("/list/class");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: getActionErrorMessage(err, {
        name: "Class name is already in use.",
      }),
    };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema,
) => {
  try {
    const classData = await getClassData(data);

    if ("message" in classData) {
      return { success: false, error: true, message: classData.message };
    }

    await prisma.class.update({
      where: {
        id: data.id,
      },
      data: classData.data,
    });

    // revalidatePath("/list/class");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: getActionErrorMessage(err, {
        name: "Class name is already in use.",
      }),
    };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = data.get("id") as string;
  try {
    const classItem = await prisma.class.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            students: true,
            lessons: true,
            events: true,
            announcements: true,
          },
        },
      },
    });

    if (!classItem) {
      return { success: false, error: true, message: "Class not found." };
    }

    if (
      classItem._count.students > 0 ||
      classItem._count.lessons > 0 ||
      classItem._count.events > 0 ||
      classItem._count.announcements > 0
    ) {
      return {
        success: false,
        error: true,
        message: "Class is still used by related records.",
      };
    }

    await prisma.class.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/class");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: getActionErrorMessage(err),
    };
  }
};

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema,
) => {
  let clerkUserId: string | undefined;
  let prismaTeacherCreated = false;

  try {
    const uniqueMessage = await getUniqueTeacherMessage(data);

    if (uniqueMessage) {
      return { success: false, error: true, message: uniqueMessage };
    }

    const client = await clerkClient();

    const user = await client.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "teacher" },
    });
    clerkUserId = user.id;

    await prisma.teacher.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: normalizeOptionalString(data.email),
        phone: normalizeOptionalString(data.phone),
        address: data.address,
        img: normalizeOptionalString(data.img),
        bloodType: data.bloodType,
        sex: data.sex.toUpperCase() as UserSex,
        birthday: new Date(data.birthday),
        subjects: {
          connect: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });
    prismaTeacherCreated = true;

    return { success: true, error: false };
  } catch (err) {
    console.log(err);

    if (clerkUserId && !prismaTeacherCreated) {
      try {
        const client = await clerkClient();
        await client.users.deleteUser(clerkUserId);
      } catch (cleanupErr) {
        console.log(cleanupErr);
      }
    }

    return {
      success: false,
      error: true,
      message: getActionErrorMessage(err),
    };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema,
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id: data.id },
      select: { id: true },
    });

    if (!existingTeacher) {
      return { success: false, error: true, message: "Teacher not found." };
    }

    const uniqueMessage = await getUniqueTeacherMessage(data);

    if (uniqueMessage) {
      return { success: false, error: true, message: uniqueMessage };
    }

    if (isClerkUserId(data.id)) {
      const client = await clerkClient();

      await client.users.updateUser(data.id, {
        username: data.username,
        ...(data.password ? { password: data.password } : {}),
        firstName: data.name,
        lastName: data.surname,
        publicMetadata: { role: "teacher" },
      });
    }

    await prisma.teacher.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: normalizeOptionalString(data.email),
        phone: normalizeOptionalString(data.phone),
        address: data.address,
        img: normalizeOptionalString(data.img),
        bloodType: data.bloodType,
        sex: data.sex.toUpperCase() as UserSex,
        birthday: new Date(data.birthday),
        subjects: {
          set: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: getActionErrorMessage(err),
    };
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = data.get("id") as string;

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            lessons: true,
          },
        },
      },
    });

    if (!teacher || teacher._count.lessons > 0) {
      return { success: false, error: true };
    }

    await prisma.teacher.delete({
      where: {
        id,
      },
    });

    if (isClerkUserId(id)) {
      const client = await clerkClient();
      await client.users.deleteUser(id);
    }

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema,
) => {
  let clerkUserId: string | undefined;
  let prismaStudentCreated = false;

  try {
    const relationMessage = await validateStudentRelations(data);

    if (relationMessage) {
      return { success: false, error: true, message: relationMessage };
    }

    const uniqueMessage = await getUniqueStudentMessage(data);

    if (uniqueMessage) {
      return { success: false, error: true, message: uniqueMessage };
    }

    const client = await clerkClient();

    const user = await client.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "student" },
    });
    clerkUserId = user.id;

    await prisma.student.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: normalizeOptionalString(data.email),
        phone: normalizeOptionalString(data.phone),
        address: data.address,
        img: normalizeOptionalString(data.img),
        bloodType: data.bloodType,
        sex: data.sex.toUpperCase() as UserSex,
        birthday: new Date(data.birthday),
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
      },
    });
    prismaStudentCreated = true;

    return { success: true, error: false };
  } catch (err) {
    console.log(err);

    if (clerkUserId && !prismaStudentCreated) {
      try {
        const client = await clerkClient();
        await client.users.deleteUser(clerkUserId);
      } catch (cleanupErr) {
        console.log(cleanupErr);
      }
    }

    return {
      success: false,
      error: true,
      message: getActionErrorMessage(err),
    };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema,
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    const existingStudent = await prisma.student.findUnique({
      where: { id: data.id },
      select: { id: true, classId: true },
    });

    if (!existingStudent) {
      return { success: false, error: true, message: "Student not found." };
    }

    const relationMessage = await validateStudentRelations(
      data,
      existingStudent.classId,
    );

    if (relationMessage) {
      return { success: false, error: true, message: relationMessage };
    }

    const uniqueMessage = await getUniqueStudentMessage(data);

    if (uniqueMessage) {
      return { success: false, error: true, message: uniqueMessage };
    }

    if (isClerkUserId(data.id)) {
      const client = await clerkClient();

      await client.users.updateUser(data.id, {
        username: data.username,
        ...(data.password ? { password: data.password } : {}),
        firstName: data.name,
        lastName: data.surname,
        publicMetadata: { role: "student" },
      });
    }

    await prisma.student.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: normalizeOptionalString(data.email),
        phone: normalizeOptionalString(data.phone),
        address: data.address,
        img: normalizeOptionalString(data.img),
        bloodType: data.bloodType,
        sex: data.sex.toUpperCase() as UserSex,
        birthday: new Date(data.birthday),
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: getActionErrorMessage(err),
    };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = data.get("id") as string;
  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            attendances: true,
            results: true,
          },
        },
      },
    });

    if (!student || student._count.attendances > 0 || student._count.results > 0) {
      return { success: false, error: true };
    }

    await prisma.student.delete({
      where: {
        id: id,
      },
    });

    if (isClerkUserId(id)) {
      const client = await clerkClient();
      await client.users.deleteUser(id);
    }

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema,
) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    if (role !== "admin" && role !== "teacher") {
      return { success: false, error: true, message: "Not authorized." };
    }

    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: {
          teacherId: userId!,
          id: data.lessonId,
        },
      });

      if (!teacherLesson) {
        return { success: false, error: true, message: "Not authorized." };
      }
    } else {
      const lesson = await prisma.lesson.findUnique({
        where: { id: data.lessonId },
        select: { id: true },
      });

      if (!lesson) {
        return { success: false, error: true, message: "Lesson not found." };
      }
    }

    await prisma.exam.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: getActionErrorMessage(err),
    };
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema,
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Exam not found." };
  }

  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    if (role !== "admin" && role !== "teacher") {
      return { success: false, error: true, message: "Not authorized." };
    }

    const existingExam = await prisma.exam.findUnique({
      where: { id: data.id },
      select: {
        id: true,
        lesson: {
          select: {
            teacherId: true,
          },
        },
      },
    });

    if (!existingExam) {
      return { success: false, error: true, message: "Exam not found." };
    }

    if (role === "teacher" && existingExam.lesson.teacherId !== userId) {
      return { success: false, error: true, message: "Not authorized." };
    }

    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: {
          teacherId: userId!,
          id: data.lessonId,
        },
      });

      if (!teacherLesson) {
        return { success: false, error: true, message: "Not authorized." };
      }
    } else {
      const lesson = await prisma.lesson.findUnique({
        where: { id: data.lessonId },
        select: { id: true },
      });

      if (!lesson) {
        return { success: false, error: true, message: "Lesson not found." };
      }
    }

    await prisma.exam.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: getActionErrorMessage(err),
    };
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = data.get("id") as string;

  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    if (role !== "admin" && role !== "teacher") {
      return { success: false, error: true, message: "Not authorized." };
    }

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        lesson: {
          select: {
            teacherId: true,
          },
        },
      },
    });

    if (!exam) {
      return { success: false, error: true, message: "Exam not found." };
    }

    if (role === "teacher" && exam.lesson.teacherId !== userId) {
      return { success: false, error: true, message: "Not authorized." };
    }

    await prisma.exam.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      error: true,
      message: getActionErrorMessage(err),
    };
  }
};

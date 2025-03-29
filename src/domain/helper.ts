const generateId = () => {
  return Bun.randomUUIDv7();
};

export const createId = <T>() => generateId() as T;

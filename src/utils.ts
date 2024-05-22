
export const failWith = (errorMessage: string): never => {
    throw new Error(errorMessage);
};

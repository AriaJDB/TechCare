export default {
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/techcare/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2022',
          module: 'commonjs',
          moduleResolution: 'node10',
          ignoreDeprecations: '6.0',
          esModuleInterop: true,
          skipLibCheck: true,
          strict: true,
          types: ['jest', 'node'],
        },
      },
    ],
  },
};
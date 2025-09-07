export default {
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    moduleFileExtensions: ['js'],
    testMatch: ['**/tests/**/*.test.js'],
};

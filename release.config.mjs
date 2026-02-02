const options = {
  packages: [
    {
      paths: ["./"],
      plugins: [
        "@lets-release/commit-analyzer",
        "@lets-release/release-notes-generator",
        "@lets-release/npm",
        "@lets-release/github",
      ],
    },
  ],
  releaseCommit: {
    assets: ["package.json"],
  },
};

export default options;

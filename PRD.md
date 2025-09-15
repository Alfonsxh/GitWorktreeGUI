## 背景

- 当前在使用 AI 工具进行编码时，会出现同一时间修改同一个项目的情况
- 我知道一个 git worktree 的特性，可以在不同的 git worktree 中完整实现，再进行merge 合并
- git worktree 这种方式很方便开发，但是，完全使用终端工具，很不方便
- 我需要一个 GUI 程序来实现这一个过程

## 任务

实现一个 GUI 工具实现git worktree，方便AI 编程工具开发

## 规划

- 支持 Macos
- 能够打开项目，默认分支为打开项目的分支
- 能够创建项目的worktree
  - 默认情况下，在项目父目录下创建一个 worktree 目录用于保存代码
  - 根据 特性 进行创建，例如：A 项目 特性 feature，应该创建目录 .worktree_A_feature
- 能够支持基础的 git 功能，可以参考一些开源实现
- 能够展示同一个项目的不同 git worktree
- 能够在点击不同 git worktree 时，在右侧有窗口打开终端

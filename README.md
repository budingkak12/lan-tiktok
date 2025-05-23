我需要在手机上或者电脑浏览器上管理本机电脑媒体路径里的所有图片和视频（递归遍历图片和视频类型）
电脑媒体路径：/Users/bu/Desktop/img

技术：
Python  fastapi sqlite

![image](https://github.com/user-attachments/assets/5906fc08-1849-4caa-b76a-0aac543bc031)
![image](https://github.com/user-attachments/assets/b3b089f6-c905-4159-af98-7e2a6e7b2986)
![image](https://github.com/user-attachments/assets/5f108c31-bc6c-44ba-843d-0319e9f00852)
![image](https://github.com/user-attachments/assets/cb26e167-db9e-483b-a660-b354c3c9643d)





1、
主页
像 tiktok 的首页一样，每次只展示一个视频或者图片，占据整个屏幕（无分心元素），上下滑动切换媒体 swiper 实现 类似抖音的交互效果，键盘上下也可以切换媒体，支持对当前预览媒体点赞 收藏 删除 快捷添加自定义标签，常用标签：系统内置、猫 狗 美食 等常用标签

2、
搜索页面，点击主页搜索按钮进入搜索页面，对标签单选多选搜索，搜索结果网格缩略图展示，点击缩略图，进入播放器浏览搜索列表，退出播放器需要搜索列表保持不变，从搜索页面返回主页播放器要求状态不变

3、
文件夹浏览：像 mac 文件管理一样打开媒体路径，查看里面的媒体，点击媒体文件即可进入播放器，可以对其点赞收藏。

4、路径内有 10w 级别数量媒体，需要有良好的性能，仿照 tiktok 的模式 ，文件按需加载

5、大小超过 5MB的视频需要用流式传输。


程序列表内部管理逻辑
sequenceDiagram
各个列表、排序，全都由后端来管理，

    Client->>Server: GET /init (获取user_seed)
    Server-->>Client: { seed: "a1b2c3" }
    Client->>Server: GET /adjacent?id=id3&dir=next (切换图片)
    Server-->>Client: { next_id: "id1" }


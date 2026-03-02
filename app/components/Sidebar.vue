<template>
  <div class="sidebar">
    <!-- 日历卡片 -->
    <div class="sidebar-card calendar-card">
      <el-calendar v-model="currentDate">
        <template #date-cell="{ data }">
          <div class="calendar-cell">
            <span class="date-number">{{ data.day.split('-').slice(-1)[0] }}</span>
            <span
              v-if="hasPost(data)"
              class="post-indicator"
            >
              ·
            </span>
          </div>
        </template>
      </el-calendar>
    </div>
  </div>
</template>

<script setup lang="ts">

// 当前日期
const currentDate = ref(new Date())

// 模拟数据：某天是否有文章（实际应该从后端获取）
// 格式：'YYYY-MM-DD'
const postDates = new Set([
  '2025-03-01',
  '2025-03-05',
  '2025-03-10',
  '2025-03-15',
])

// 检查某天是否有文章
const hasPost = (data: { day: string; isSelected: boolean; type: string }) => {
  return postDates.has(data.day)
}
</script>

<style lang="scss" scoped>
.sidebar {
  width: 100%;
  height: 100%;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sidebar-card {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid var(--border-color, #e0e0e0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.calendar-card {
  padding: 0;
  overflow: hidden;

  :deep(.el-calendar) {
    --el-calendar-border: none;
    --el-calendar-header-border-color: var(--border-color, #e0e0e0);
    --el-calendar-text-color: var(--text-primary);
    --el-calendar-font-size: 14px;

    .el-calendar__header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }

    .el-calendar__body {
      padding: 8px 12px 12px;
    }

    .el-calendar-table {
      td {
        border: none;
      }

      .el-calendar-day {
        height: 40px;
        text-align: center;
        padding: 0;

        &:hover {
          background: var(--bg-hover, #f5f5f5);
        }
      }
    }
  }
}

.calendar-cell {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;

  .date-number {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .post-indicator {
    position: absolute;
    bottom: 4px;
    font-size: 20px;
    line-height: 1;
    color: var(--accent-color, #007aff);
    font-weight: bold;
  }
}

// 暗色主题适配
.dark .calendar-cell {
  .date-number {
    color: var(--text-primary);
  }

  .post-indicator {
    color: var(--accent-color);
  }
}
</style>

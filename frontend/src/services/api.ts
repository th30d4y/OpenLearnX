export const dashboardService = {
  async getStudentDashboard(userId: string) {
    return {
      user_info: { id: userId, wallet_address: '0x...', member_since: new Date().toISOString(), last_login: new Date().toISOString() },
      overview: { total_tests: 0, completed_tests: 0, average_score: 0, certificates_earned: 0, this_week_tests: 0, this_month_tests: 0 },
      subject_breakdown: {},
      recent_activity: [],
      certificates: []
    }
  }
}

export const certificateService = {
  async getUserCertificates(userId: string) {
    return { certificates: [] }
  }
}

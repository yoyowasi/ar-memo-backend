# Node.js 최신 LTS 버전 이미지 사용
FROM node:22

# 컨테이너 내부 작업 디렉토리 설정
WORKDIR /app

# package.json / package-lock.json 복사 후 의존성 설치
COPY package*.json ./
RUN npm install --production

# 프로젝트 전체 복사
COPY . .

# 환경변수 (필요시 docker run 시점에 덮어씌움)
ENV NODE_ENV=production
ENV PORT=4000

# 컨테이너에서 노출할 포트
EXPOSE 4000

# 앱 실행
CMD ["npm", "start"]

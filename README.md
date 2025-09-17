# AR-Memo Backend Server

AR-Memo 프로젝트의 백엔드 서버입니다. Docker를 사용하여 간편하게 개발 환경을 구축하고 실행할 수 있습니다.

## 🚀 시작하기

이 가이드를 따라 다른 PC에서도 손쉽게 프로젝트를 실행할 수 있습니다.

### 필수 요구사항

프로젝트를 실행하기 위해 아래 프로그램들이 반드시 설치되어 있어야 합니다.

* **[Git](https://git-scm.com/downloads)**: 소스 코드를 내려받기 위해 필요합니다.
* **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**: 컨테이너를 실행하고 관리하기 위해 필요합니다. Docker Desktop에는 Docker Compose가 포함되어 있습니다.

-----

### 🛠️ 개발 환경 설정

#### 1\. 소스 코드 복제 (Clone)

먼저 Git을 사용하여 원격 저장소에서 프로젝트 소스 코드를 복제합니다.

```bash
git clone <저장소_URL>
cd ar-memo-backend
```

#### 2\. `docker-compose.yml` 확인

프로젝트 루트 디렉토리에 있는 `docker-compose.yml` 파일이 서버 실행에 필요한 모든 설정을 담고 있습니다. 별도로 수정할 필요는 없습니다.

-----

### ▶️ 서버 실행 및 종료

#### 서버 시작하기

프로젝트 폴더의 터미널에서 아래 명령어 단 한 줄만 입력하면 데이터베이스와 백엔드 서버가 모두 실행됩니다.

```bash
docker-compose up -d --build
```

* `up`: `docker-compose.yml`에 정의된 모든 서비스를 시작합니다.
* `-d`: 컨테이너를 백그라운드에서 실행합니다.
* `--build`: 최초 실행 시 `Dockerfile`을 이용해 이미지를 새로 빌드합니다.

서버가 정상적으로 시작되면 **`http://localhost:4000`** 주소로 API 요청을 보낼 수 있습니다.

#### 실시간 로그 확인하기

서버가 어떻게 동작하는지 실시간으로 로그를 보고 싶다면 아래 명령어를 사용하세요.

```bash
docker-compose logs -f backend
```

(종료는 `Ctrl + C`)

#### 서버 종료하기

프로젝트를 종료하고 관련 컨테이너와 네트워크를 모두 깔끔하게 정리하려면 아래 명령어를 사용합니다.

```bash
docker-compose down
```

데이터베이스 파일은 `mongo-data`라는 볼륨에 안전하게 보관되므로, 이 명령어를 실행해도 데이터가 삭제되지 않습니다.

-----

### 🧪 API 테스트

[Postman](https://www.postman.com/downloads/)과 같은 API 테스트 도구를 사용하여 서버가 잘 동작하는지 확인할 수 있습니다.

1.  **Postman Collection 가져오기**: 함께 제공된 `ar-memo-backend.postman_collection.json` 파일을 Postman의 `Import` 기능을 통해 불러옵니다.
2.  **API 테스트**: `Auth` -\> `회원가입` 요청부터 순서대로 실행하며 API를 테스트합니다. 로그인 후 발급되는 토큰은 다른 API를 호출할 때 자동으로 사용됩니다.